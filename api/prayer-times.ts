// api/prayer-times.ts
// Vercel serverless function that:
// 1) Fetches upstream adhan times JSON.
// 2) Applies iqamah rules from IQAMAH_CONFIG env var.
// 3) Returns combined adhan + iqama times with CORS headers.

import type { VercelRequest, VercelResponse } from "@vercel/node";

// Upstream URL that returns the adhan times JSON
// NOTE: same upstream you used on Netlify.
const UPSTREAM_URL = "http://132.145.105.37/prayer-times";

// All the prayer names we care about (and that exist in upstream JSON)
type PrayerName = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

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

// Types for iqamah rules coming from IQAMAH_CONFIG
type IqamahRule =
  | { type: "offset"; minutes: number } // iqamah = adhan + minutes
  | { type: "fixed"; time: string } // iqamah = fixed 24h "HH:MM"
  | { type: "none" }; // no iqamah

type IqamahConfig = {
  // One rule per prayer (optional)
  rules: Partial<Record<PrayerName, IqamahRule>>;
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

// Helper: parse IQAMAH_CONFIG env var or fall back to sensible defaults
function loadIqamahConfig(): IqamahConfig {
  // Read raw string from env
  const raw = process.env.IQAMAH_CONFIG;

  if (!raw) {
    // If env var is missing, fall back to defaults.
    return {
      rules: {
        Fajr: { type: "offset", minutes: 30 }, // adhan + 30
        Sunrise: { type: "none" }, // no iqamah
        Dhuhr: { type: "fixed", time: "13:30" }, // 1:30 PM
        Asr: { type: "offset", minutes: 5 }, // adhan + 5
        Maghrib: { type: "offset", minutes: 5 }, // adhan + 5
        Isha: { type: "fixed", time: "21:30" }, // 9:30 PM
      },
    };
  }

  try {
    // Parse JSON string into IqamahConfig
    return JSON.parse(raw) as IqamahConfig;
  } catch (err) {
    console.error("Failed to parse IQAMAH_CONFIG:", err);

    // If parsing fails, fall back to a safe default set
    return {
      rules: {
        Fajr: { type: "offset", minutes: 30 },
        Sunrise: { type: "none" },
        Dhuhr: { type: "fixed", time: "13:00" },
        Asr: { type: "offset", minutes: 5 },
        Maghrib: { type: "offset", minutes: 5 },
        Isha: { type: "fixed", time: "21:30" },
      },
    };
  }
}

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
  let mins = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;

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

    // Load iqamah configuration (rules per prayer)
    const iqamahConfig = loadIqamahConfig();
    const rules = iqamahConfig.rules || {};

    // Build combined response: adhan + iqama for each prayer
    const prayerNames: PrayerName[] = [
      "Fajr",
      "Sunrise",
      "Dhuhr",
      "Asr",
      "Maghrib",
      "Isha",
    ];

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
