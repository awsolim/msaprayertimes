// api/prayer-times.ts
// Vercel serverless function that:
// 1) Fetches upstream adhan times JSON.
// 2) Loads iqamah rules from Supabase.
// 3) Returns combined adhan + iqama times with CORS headers.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  loadIqamahRules,
  prayerNames,
  type IqamahRule,
  type PrayerName,
} from "../lib/iqamah.js";

// Upstream URL that returns the adhan-only prayer times JSON.
// Configure PRAYER_API_URL in Vercel; keep the previous service as a fallback
// so existing deployments do not fail if the variable is temporarily absent.
const UPSTREAM_URL =
  process.env.PRAYER_API_URL ?? "http://132.145.105.37/prayer-times";
const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://czbzdvpzcfnxbezxcumm.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YnpkdnB6Y2ZueGJlenhjdW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTM2NzcsImV4cCI6MjA3OTU2OTY3N30.N3gh2es8YpMUgR1vZpdrauhf-MqpEjsOj1_qTOH4_gM";

// Shape of the upstream JSON (adhan-only)
type UpstreamPrayerTimes = {
  Day: string;
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

// Type of the combined response we send back to the frontend
type CombinedPrayerInfo = {
  adhan: string; // adhan time string (e.g. "5:55 AM")
  iqama: string | null; // iqamah time string (e.g. "6:25 AM") or null if none
};

type CombinedResponse = {
  Day: string; // day name from upstream
  prayers: Record<PrayerName, CombinedPrayerInfo>; // all prayers with adhan+iqama
};

// CORS headers we want on every response
const corsHeaders: Record<string, string> = {
  // Allow any origin (so localhost + Netlify + Pi all work)
  "Access-Control-Allow-Origin": "*",
  // Methods we support
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  // Headers we allow from browsers
  "Access-Control-Allow-Headers": "Content-Type",
  // Disable caching entirely
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

// Helper: convert "h:mm AM/PM" (e.g. "5:55 AM") to minutes since midnight
function adhanStringToMinutes(timeStr: string): number {
  const [timePart, meridiem] = timeStr.split(" ");
  const [hourStr, minuteStr] = timePart.split(":");

  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

// Helper: convert "HH:MM" 24-hour string (e.g. "21:30") to minutes since midnight
function fixed24hToMinutes(timeStr: string): number {
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  return hour * 60 + minute;
}

// Helper: convert minutes since midnight back to "h:mm AM/PM" string
function minutesTo12hString(totalMinutes: number): string {
  const minutesInDay = 24 * 60;
  const mins = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;

  const hour24 = Math.floor(mins / 60);
  const minute = mins % 60;

  const meridiem = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  const minuteStr = minute.toString().padStart(2, "0");

  return `${hour12}:${minuteStr} ${meridiem}`;
}

// Helper: compute iqamah time string given an adhan time and rule
function computeIqamahTime(
  adhanTime: string,
  rule: IqamahRule | undefined
): string | null {
  // No rule or type "none" -> no iqamah
  if (!rule || rule.type === "none") {
    return null;
  }

  if (rule.type === "offset") {
    // Offset rule: iqamah = adhan + minutes
    const baseMinutes = adhanStringToMinutes(adhanTime);
    const iqamahMinutes = baseMinutes + rule.minutes;
    return minutesTo12hString(iqamahMinutes);
  }

  if (rule.type === "fixed") {
    // Fixed rule: convert "HH:MM" 24h into display string
    const fixedMinutes = fixed24hToMinutes(rule.time);
    return minutesTo12hString(fixedMinutes);
  }

  return null;
}

// Main Vercel handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle preflight OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    // Set CORS headers so browser is happy for cross-origin requests
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.status(200).send("");
    return;
  }

  try {
    // Set CORS + content type on all responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.setHeader("Content-Type", "application/json");

    // Fetch upstream adhan times JSON with cache busting
    // Add fallback for when UPSTREAM_URL already has query params? (It doesn't here)
    const url = `${UPSTREAM_URL}?t=${Date.now()}`;
    const upstreamRes = await fetch(url, {
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    if (!upstreamRes.ok) {
      // Forward upstream error with JSON body
      res
        .status(upstreamRes.status)
        .send(
          JSON.stringify({
            error: `Upstream error: ${upstreamRes.status} ${upstreamRes.statusText}`,
          })
        );
      return;
    }

    const upstreamData =
      (await upstreamRes.json()) as UpstreamPrayerTimes;

    // Load iqamah rules from Supabase. The loader uses safe fallback rules if
    // the table is temporarily unavailable.
    const rules = await loadIqamahRules(SUPABASE_URL, SUPABASE_ANON_KEY);

    const combinedPrayers: Record<
      PrayerName,
      CombinedPrayerInfo
    > = {} as Record<PrayerName, CombinedPrayerInfo>;

    for (const name of prayerNames) {
      const adhan = upstreamData[name]; // adhan time from upstream JSON
      const rule = rules[name]; // iqamah rule for this prayer
      const iqama = computeIqamahTime(adhan, rule); // string or null

      combinedPrayers[name] = { adhan, iqama };
    }

    const responseBody: CombinedResponse = {
      Day: upstreamData.Day,
      prayers: combinedPrayers,
    };

    // Send final JSON response
    res.status(200).send(JSON.stringify(responseBody));
  } catch (err) {
    console.error("Error in Vercel prayer-times function:", err);

    // Generic error if something unexpected happens
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.setHeader("Content-Type", "application/json");
    res.status(500).send(JSON.stringify({ error: "Internal server error" }));
  }
}
