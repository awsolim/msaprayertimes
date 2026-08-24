// netlify/functions/prayer-times.ts
// Netlify serverless function that:
// 1) Fetches upstream adhan times JSON.
// 2) Loads iqamah rules from Supabase.
// 3) Returns combined adhan + iqama times with CORS headers.

import type { Handler } from "@netlify/functions";
import {
  loadIqamahRules,
  prayerNames,
  type IqamahRule,
  type PrayerName,
} from "../../lib/iqamah.js";

// Upstream URL that returns the adhan-only prayer times JSON
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

// Upstream JSON structure
type UpstreamPrayerTimes = {
  Day: string;
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

// Final API response shape
type CombinedPrayerInfo = {
  adhan: string;
  iqama: string | null;
};

type CombinedResponse = {
  Day: string;
  prayers: Record<PrayerName, CombinedPrayerInfo>;
};

// -------------------------
// CORS HEADERS (FIXED)
// -------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

// -------------------------
// Time conversion utilities
// -------------------------
function adhanStringToMinutes(timeStr: string): number {
  const [timePart, meridiem] = timeStr.split(" ");
  const [hourStr, minuteStr] = timePart.split(":");

  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function fixed24hToMinutes(timeStr: string): number {
  const [hourStr, minuteStr] = timeStr.split(":");
  return parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10);
}

function minutesTo12hString(totalMinutes: number): string {
  const minutesInDay = 24 * 60;
  const mins = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;

  const hour24 = Math.floor(mins / 60);
  const minute = mins % 60;

  const meridiem = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return `${hour12}:${minute.toString().padStart(2, "0")} ${meridiem}`;
}

// -------------------------
// Compute iqamah time
// -------------------------
function computeIqamahTime(
  adhanTime: string,
  rule: IqamahRule | undefined
): string | null {
  if (!rule || rule.type === "none") return null;

  if (rule.type === "offset") {
    const base = adhanStringToMinutes(adhanTime);
    return minutesTo12hString(base + rule.minutes);
  }

  if (rule.type === "fixed") {
    return minutesTo12hString(fixed24hToMinutes(rule.time));
  }

  return null;
}

// -------------------------
// MAIN HANDLER
// -------------------------
export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    // Fetch upstream adhan times
    const url = `${UPSTREAM_URL}?t=${Date.now()}`;
    const upstreamRes = await fetch(url, {
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    if (!upstreamRes.ok) {
      return {
        statusCode: upstreamRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: `Upstream error: ${upstreamRes.status} ${upstreamRes.statusText}`,
        }),
      };
    }

    const upstreamData = (await upstreamRes.json()) as UpstreamPrayerTimes;

    const rules = await loadIqamahRules(SUPABASE_URL, SUPABASE_ANON_KEY);

    const combinedPrayers: Record<
      PrayerName,
      CombinedPrayerInfo
    > = {} as Record<PrayerName, CombinedPrayerInfo>;

    for (const name of prayerNames) {
      const adhan = upstreamData[name];
      const rule = rules[name];
      const iqama = computeIqamahTime(adhan, rule);

      combinedPrayers[name] = { adhan, iqama };
    }

    const responseBody: CombinedResponse = {
      Day: upstreamData.Day,
      prayers: combinedPrayers,
    };

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(responseBody),
    };
  } catch (err) {
    console.error("Error in Netlify prayer-times function:", err);

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal server error",
      }),
    };
  }
};
