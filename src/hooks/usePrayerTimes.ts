// src/hooks/usePrayerTimes.ts

import { useEffect, useState } from "react";

// Use the Netlify function as the single API endpoint
const API_PATH =
  "https://msaprayerdisplay.netlify.app/.netlify/functions/prayer-times";

// Names of prayers we care about
export type PrayerName = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

// Final normalized shape we want everywhere in the app
export type PrayerTimes = {
  Day: string;
  prayers: Record<
    PrayerName,
    {
      adhan: string;        // adhan time string
      iqama: string | null; // iqamah time string (or null if none)
    }
  >;
};

// Possible “old” upstream shape (flat fields)
type FlatPrayerTimes = {
  Day: string;
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

// Helper: normalize whatever JSON we get into the PrayerTimes shape
function normalizePrayerTimes(raw: any): PrayerTimes {
  // Case 1: already in new format with `prayers`
  if (raw && typeof raw === "object" && "prayers" in raw) {
    // Assume it matches PrayerTimes
    return raw as PrayerTimes;
  }

  // Case 2: old flat format → wrap into `prayers` with iqama = null
  const flat = raw as FlatPrayerTimes;

  const prayers: PrayerTimes["prayers"] = {
    Fajr: { adhan: flat.Fajr, iqama: null },
    Sunrise: { adhan: flat.Sunrise, iqama: null },
    Dhuhr: { adhan: flat.Dhuhr, iqama: null },
    Asr: { adhan: flat.Asr, iqama: null },
    Maghrib: { adhan: flat.Maghrib, iqama: null },
    Isha: { adhan: flat.Isha, iqama: null },
  };

  return {
    Day: flat.Day,
    prayers,
  };
}

export default function usePrayerTimes() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let midnightTimeout: number | undefined;

    const fetchPrayerTimes = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log("Fetching prayer times from:", API_PATH);
        const res = await fetch(API_PATH);

        const contentType = res.headers.get("content-type");
        console.log("Prayer-times content-type:", contentType);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const raw = await res.json();
        console.log("Prayer-times raw data:", raw);

        // 🔹 Normalize the data so the rest of the app sees a consistent shape
        const normalized = normalizePrayerTimes(raw);
        console.log("Prayer-times normalized:", normalized);

        setPrayerTimes(normalized);
      } catch (err: unknown) {
        console.error("Error fetching prayer times:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown error while fetching prayer times");
        }
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately on mount
    fetchPrayerTimes();

    // Schedule a refresh just after midnight
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const tomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        5
      ); // 5 seconds after midnight

      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      midnightTimeout = window.setTimeout(fetchPrayerTimes, msUntilMidnight);
    };

    scheduleMidnightRefresh();

    // Cleanup timeout when unmounting
    return () => {
      if (midnightTimeout !== undefined) {
        clearTimeout(midnightTimeout);
      }
    };
  }, []);

  return { prayerTimes, loading, error };
}
