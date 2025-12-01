// netlify/functions/prayer-times.ts
// Netlify serverless function that:
// 1) Fetches upstream adhan times JSON.
// 2) Applies iqamah rules from IQAMAH_CONFIG env var.
// 3) Returns combined adhan + iqama times with CORS headers.

import type { Handler } from "@netlify/functions";

// Upstream URL that returns the adhan times JSON
const UPSTREAM_URL = "http://132.145.105.37/prayer-times";

// All the prayer names we care about
type PrayerName = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

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

// Iqamah rules
type IqamahRule =
  | { type: "offset"; minutes: number }
  | { type: "fixed"; time: string }
  | { type: "none" };

type IqamahConfig = {
  rules: Partial<Record<PrayerName, IqamahRule>>;
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
};

// -------------------------
// Utility: load iqamah rules
// -------------------------
function loadIqamahConfig(): IqamahConfig {
  const raw = process.env.IQAMAH_CONFIG;

  if (!raw) {
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

  try {
    return JSON.parse(raw) as IqamahConfig;
  } catch {
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
  let mins = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;

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
    const upstreamRes = await fetch(UPSTREAM_URL);

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

    const iqamahConfig = loadIqamahConfig();
    const rules = iqamahConfig.rules || {};

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
    > = {} as any;

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
