// netlify/functions/prayer-times.ts
// Netlify serverless function that:
// 1) Fetches upstream adhan times JSON.
// 2) Applies iqamah rules from IQAMAH_CONFIG env var.
// 3) Returns combined adhan + iqama times with CORS headers.

import type { Handler } from "@netlify/functions";

// Upstream URL that returns the adhan times JSON
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
  | { type: "fixed"; time: string }     // iqamah = fixed 24h "HH:MM"
  | { type: "none" };                   // no iqamah

type IqamahConfig = {
  rules: Partial<Record<PrayerName, IqamahRule>>; // one rule per prayer (optional)
};

// Type of the combined response we send back to the frontend
type CombinedPrayerInfo = {
  adhan: string;              // adhan time string (e.g. "5:55 AM")
  iqama: string | null;       // iqamah time string (e.g. "6:25 AM") or null if none
};

type CombinedResponse = {
  Day: string;                                          // day name from upstream
  prayers: Record<PrayerName, CombinedPrayerInfo>;      // all prayers with adhan+iqama
};

// CORS headers we want on every response
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",                 // allow any origin (you can restrict later)
  "Access-Control-Allow-Methods": "GET, OPTIONS",     // allowed methods
  "Access-Control-Allow-Headers": "Content-Type",     // allowed headers
};

// Helper: parse IQAMAH_CONFIG env var or fall back to sensible defaults
function loadIqamahConfig(): IqamahConfig {
  // Read raw string from env
  const raw = process.env.IQAMAH_CONFIG;

  if (!raw) {
    // If env var is missing, fall back to a simple default.
    // You can adjust these defaults, but ideally you always set IQAMAH_CONFIG in Netlify.
    return {
      rules: {
        Fajr: { type: "offset", minutes: 30 },        // adhan + 30
        Sunrise: { type: "none" },                    // no iqamah
        Dhuhr: { type: "fixed", time: "13:30" },      // 1:30 PM
        Asr: { type: "offset", minutes: 5 },          // adhan + 5
        Maghrib: { type: "offset", minutes: 5 },      // adhan + 5
        Isha: { type: "fixed", time: "21:30" },       // 9:30 PM
      },
    };
  }

  try {
    // Parse JSON string into IqamahConfig
    return JSON.parse(raw) as IqamahConfig;
  } catch (err) {
    console.error("Failed to parse IQAMAH_CONFIG:", err);

    // If parsing fails, fall back to the same defaults as above
    return {
      rules: {
        Fajr: { type: "offset", minutes: 30 },
        Sunrise: { type: "none" },
        Dhuhr: { type: "fixed", time: "13:30" },
        Asr: { type: "offset", minutes: 5 },
        Maghrib: { type: "offset", minutes: 5 },
        Isha: { type: "fixed", time: "21:30" },
      },
    };
  }
}

// Helper: convert "h:mm AM/PM" (e.g. "5:55 AM") to minutes since midnight
function adhanStringToMinutes(timeStr: string): number {
  // Split into "h:mm" and "AM"/"PM"
  const [timePart, meridiem] = timeStr.split(" ");
  const [hourStr, minuteStr] = timePart.split(":");

  let hour = parseInt(hourStr, 10);    // hours as number (1-12)
  const minute = parseInt(minuteStr, 10); // minutes as number

  // Convert 12-hour clock to 24-hour clock
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute; // total minutes since midnight
}

// Helper: convert "HH:MM" 24-hour string (e.g. "21:30") to minutes since midnight
function fixed24hToMinutes(timeStr: string): number {
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);       // hours 0-23
  const minute = parseInt(minuteStr, 10);   // minutes 0-59
  return hour * 60 + minute;                // total minutes
}

// Helper: convert minutes since midnight back to "h:mm AM/PM" string
function minutesTo12hString(totalMinutes: number): string {
  // Normalize to [0, 24*60)
  const minutesInDay = 24 * 60;
  let mins = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;

  const hour24 = Math.floor(mins / 60); // 0-23
  const minute = mins % 60;             // 0-59

  const meridiem = hour24 >= 12 ? "PM" : "AM"; // AM/PM
  let hour12 = hour24 % 12;                    // 0-11 for display
  if (hour12 === 0) hour12 = 12;               // convert 0 to 12 for 12-hour clock

  const minuteStr = minute.toString().padStart(2, "0"); // pad minutes with leading zero

  return `${hour12}:${minuteStr} ${meridiem}`; // e.g. "9:30 PM"
}

// Helper: compute iqamah time string given an adhan time and rule
function computeIqamahTime(adhanTime: string, rule: IqamahRule | undefined): string | null {
  // If no rule or type "none", we return null (meaning no iqamah time)
  if (!rule || rule.type === "none") {
    return null;
  }

  if (rule.type === "offset") {
    // Offset rule: iqamah = adhan + minutes
    const baseMinutes = adhanStringToMinutes(adhanTime); // convert adhan string to minutes
    const iqamahMinutes = baseMinutes + rule.minutes;    // add offset
    return minutesTo12hString(iqamahMinutes);            // convert back to "h:mm AM/PM"
  }

  if (rule.type === "fixed") {
    // Fixed rule: we interpret "HH:MM" 24h string and convert to 12h
    const fixedMinutes = fixed24hToMinutes(rule.time);   // convert fixed time to minutes
    return minutesTo12hString(fixedMinutes);             // convert to "h:mm AM/PM"
  }

  return null; // fallback (shouldn't be reached)
}

export const handler: Handler = async (event) => {
  // Handle preflight OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    // Fetch upstream adhan times
    const upstreamRes = await fetch(UPSTREAM_URL);

    if (!upstreamRes.ok) {
      // If upstream fails, forward error with CORS headers
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

    // Parse upstream JSON as adhan-only structure
    const upstreamData = (await upstreamRes.json()) as UpstreamPrayerTimes;

    // Load iqamah configuration (rules per prayer)
    const iqamahConfig = loadIqamahConfig();
    const rules = iqamahConfig.rules || {};

    // Build combined response: adhan + iqama for each prayer
    const prayerNames: PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

    const combinedPrayers: Record<PrayerName, CombinedPrayerInfo> = {} as Record<
      PrayerName,
      CombinedPrayerInfo
    >;

    for (const name of prayerNames) {
      const adhan = upstreamData[name];       // adhan time from upstream JSON
      const rule = rules[name];              // iqamah rule for this prayer (if any)
      const iqama = computeIqamahTime(adhan, rule); // compute iqamah string or null

      combinedPrayers[name] = {
        adhan, // keep original adhan time string
        iqama, // computed iqamah time string (or null)
      };
    }

    const responseBody: CombinedResponse = {
      Day: upstreamData.Day, // keep day name from upstream
      prayers: combinedPrayers,
    };

    // Return final JSON with CORS headers
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

    // Generic error if something unexpected happens
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
