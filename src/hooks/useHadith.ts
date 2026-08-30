// src/hooks/useHadith.ts
// Fetch hadiths from Proxy and select one based on the Day of Year.
// Refreshes at midnight to rotate the hadith.

import { useEffect, useState } from "react";

export type HadithRow = {
  id: string;
  arabic_text: string;
  english_text: string;
  narrator: string;
  source: string;
  is_active: boolean;
  created_at: string;
};

type UseHadithResult = {
  hadith: HadithRow | null;
  loading: boolean;
  error: string | null;
};

export default function useHadith(enabled = true): UseHadithResult {
  const [hadith, setHadith] = useState<HadithRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    let timerId: number | undefined;

    async function fetchHadiths() {
      if (isCancelled) return;
      
      try {
        setLoading(true);
        console.log("Fetching hadiths...");

        const response = await fetch("/api/hadith");
        if (!response.ok) {
           throw new Error("Failed to fetch hadiths from proxy");
        }

        const data = (await response.json()) as HadithRow[];

        if (!data || data.length === 0) {
          if (!isCancelled) {
            setHadith(null);
            setError(null);
          }
        } else {
          // "Hadith of the Day" Logic (keeps rotating daily)
          const today = new Date();
          const startOfYear = new Date(today.getFullYear(), 0, 0);
          const diffMs = today.getTime() - startOfYear.getTime();
          const dayOfYear = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          const index = dayOfYear % data.length;
          const chosen = data[index];

          if (!isCancelled) {
            setHadith(chosen);
            setError(null);
          }
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : "Unknown error loading hadith",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }

      scheduleNextRefresh();
    }

    const scheduleNextRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        5
      );
      const msUntil = nextMidnight.getTime() - now.getTime();
      
      if (timerId) clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        fetchHadiths();
      }, msUntil);
    };

    fetchHadiths();

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [enabled]);

  return { hadith, loading, error };
}
