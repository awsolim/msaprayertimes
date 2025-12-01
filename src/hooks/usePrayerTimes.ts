// src/hooks/usePrayerTimes.ts

import { useEffect, useState } from "react";
import useNow from "./useNow";

// ------------------------------
// Types
// ------------------------------
export type PrayerName =
  | "Fajr"
  | "Sunrise"
  | "Dhuhr"
  | "Asr"
  | "Maghrib"
  | "Isha";

export type CombinedPrayerInfo = {
  adhan: string;
  iqama: string | null;
};

export type PrayerTimes = {
  Day: string;
  prayers: Record<PrayerName, CombinedPrayerInfo>;
};

// ------------------------------
// NEW: BACKEND URL (Vercel API)
// ------------------------------
const PRAYER_API_URL =
  import.meta.env.VITE_PRAYER_API_URL ??
  "https://msaprayertimes.vercel.app/api/prayer-times"; 
// ^ Replace with YOUR exact Vercel project URL if different

// ------------------------------
// Fetch prayer times from Vercel
// ------------------------------
async function fetchPrayerTimes(): Promise<PrayerTimes> {
  console.log("Fetching prayer times from:", PRAYER_API_URL);

  const res = await fetch(PRAYER_API_URL, { method: "GET" });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} | Failed to fetch prayer times`);
  }

  const data = await res.json();
  return data as PrayerTimes;
}

// ------------------------------
// Hook: usePrayerTimes()
// ------------------------------
export default function usePrayerTimes() {
  const now = useNow();
  const [data, setData] = useState<PrayerTimes | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch on mount + once per new day
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const d = await fetchPrayerTimes();
        setData(d);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    load();

    // Refresh once at midnight
    const scheduleMidnightRefresh = () => {
      const next = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        2
      ).getTime();
      const msUntil = next - Date.now();
      return setTimeout(load, msUntil);
    };

    const timer = scheduleMidnightRefresh();
    return () => clearTimeout(timer);
  }, []);

  return { data, error, loading };
}
