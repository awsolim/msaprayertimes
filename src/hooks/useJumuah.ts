// src/hooks/useJumuah.ts
// Fetch the active Jumuah settings from Supabase.
// Refreshes only once per day (at midnight) to save API calls.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type JumuahSettings = {
  id: string;
  title: string;
  place: string | null;
  description: string | null;
  weekday: number;
  first_start: string;
  first_end: string;
  second_start: string | null;
  second_end: string | null;
  is_active: boolean;
  updated_at: string;
};

export default function useJumuah() {
  const [jumuah, setJumuah] = useState<JumuahSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let timerId: number | undefined;

    const fetchJumuah = async () => {
      if (isCancelled) return;
      
      try {
        setLoading(true);
        console.log("Fetching Jumuah settings...");

        const { data, error } = await supabase
          .from("jumuah_settings")
          .select("*")
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (isCancelled) return;

        if (error) {
          setError(error.message);
        } else {
          setError(null);
          setJumuah(data ?? null);
        }
      } catch (err: any) {
        if (!isCancelled) setError(err.message);
      } finally {
        if (!isCancelled) setLoading(false);
      }

      // Schedule the next refresh for the upcoming midnight
      scheduleNextRefresh();
    };

    const scheduleNextRefresh = () => {
      const now = new Date();
      // Calculate time until next midnight (00:00:05 am to be safe)
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        5
      );
      const msUntil = nextMidnight.getTime() - now.getTime();

      // Clear any existing timer just in case
      if (timerId) clearTimeout(timerId);

      // Set timer to fetch again tomorrow
      timerId = window.setTimeout(() => {
        fetchJumuah();
      }, msUntil);
    };

    // Initial fetch
    fetchJumuah();

    // Cleanup on unmount
    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  return { jumuah, loading, error };
}