// src/hooks/usePrayerPhase.ts
// Determines whether we are in "normal", "adhan", or "iqama" mode
// based on the current time and the day's prayer times.

import type { PrayerTimes, PrayerName } from "./usePrayerTimes";
import useNow from "./useNow";

// 👉 You can change these to whatever durations you want
//    (in minutes) for how long the fullscreen screens show.
const ADHAN_SCREEN_MINUTES = 2;  // how long "Time for Adhan" stays
const IQAMA_SCREEN_MINUTES = 10; // how long "Time for Prayer" stays

export type PrayerPhaseType = "normal" | "adhan" | "iqama";

export interface PrayerPhaseResult {
  phase: PrayerPhaseType;      // "normal" | "adhan" | "iqama"
  activePrayer: PrayerName | null; // which prayer this phase applies to
}

const ORDER: PrayerName[] = [
  "Fajr",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];

// Helper: parse "5:55 AM" style time into a Date *today*
function parseTimeToday(raw: string, now: Date): Date {
  // raw looks like "5:55 AM"
  const [time, meridiem] = raw.split(" ");
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);          // hour as number
  const m = parseInt(mStr, 10);        // minute as number

  // convert to 24-hour based on AM/PM rules
  if (meridiem === "PM" && h !== 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;

  // build a Date for *today* with that hour/minute
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    0
  );
}

// Helper: check if "now" is between [start, start + minutes)
function isWithinWindow(now: Date, start: Date, minutes: number): boolean {
  const end = new Date(start.getTime() + minutes * 60 * 1000); // add minutes
  return now >= start && now < end;
}

export default function usePrayerPhase(
  prayerTimes: PrayerTimes | null
): PrayerPhaseResult {
  // useNow gives us the shared "now" (respects ?debugTime=HH:MM too)
  const now = useNow();

  if (!prayerTimes) {
    // If we don't have data yet, just be in normal mode
    return { phase: "normal", activePrayer: null };
  }

  const { prayers } = prayerTimes;

  // Default: assume normal mode
  let phase: PrayerPhaseType = "normal";
  let activePrayer: PrayerName | null = null;

  // We loop in order and choose the *latest* matching window,
  // so that Iqamah (later) overrides Adhan if they overlap.
  for (const name of ORDER) {
    const info = prayers[name];

    // 1) Check Adhan window if adhan time exists
    if (info.adhan) {
      const adhanTime = parseTimeToday(info.adhan, now); // adhan Date
      if (isWithinWindow(now, adhanTime, ADHAN_SCREEN_MINUTES)) {
        phase = "adhan";
        activePrayer = name;
      }
    }

    // 2) Check Iqama window if iqama time exists
    if (info.iqama) {
      const iqamaTime = parseTimeToday(info.iqama, now); // iqama Date
      if (isWithinWindow(now, iqamaTime, IQAMA_SCREEN_MINUTES)) {
        // Iqama should override adhan if both would match
        phase = "iqama";
        activePrayer = name;
      }
    }
  }

  return { phase, activePrayer };
}
