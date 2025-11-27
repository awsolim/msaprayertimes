// src/hooks/useHadithOfTheDay.ts
// This hook fetches all active hadiths from Supabase once,
// then picks *one* hadith based on today's date (Hadith of the Day).
// It does NOT refetch on slide rotation; RotatingSlides just reads the hadith.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient"; // shared Supabase client

// Shape of a row in the "hadiths" table
export type HadithRow = {
  id: string;               // unique ID
  arabic_text: string;      // Arabic text of the hadith
  english_text: string;     // English translation
  narrator: string;         // narrator (e.g. "Abu Hurayrah (ra)")
  source: string;           // reference (e.g. "Sahih al-Bukhari, Hadith 1")
  is_active: boolean;       // whether this hadith is eligible to be shown
  created_at: string;       // timestamp string from Supabase
};

type UseHadithResult = {
  hadith: HadithRow | null; // the chosen hadith of the day (or null if none)
  loading: boolean;         // true while we are fetching
  error: string | null;     // error message if something went wrong
};

export default function useHadith(): UseHadithResult {
  const [hadith, setHadith] = useState<HadithRow | null>(null); // NEW: store the chosen hadith
  const [loading, setLoading] = useState<boolean>(true);        // NEW: track loading state
  const [error, setError] = useState<string | null>(null);      // NEW: track error state

  useEffect(() => {
    let isCancelled = false; // NEW: guard to avoid setting state after unmount

    async function fetchHadiths() {
      try {
        setLoading(true);    // NEW: mark as loading while we fetch

        // NEW: fetch all active hadiths from Supabase
        const { data, error: supabaseError } = await supabase
          .from("hadiths")                        // table name
          .select("*")                            // get all columns
          .eq("is_active", true)                  // only active hadiths
          .order("created_at", { ascending: true }); // order so "stable" day selection works

        if (supabaseError) {
          if (!isCancelled) {
            setError(supabaseError.message);      // NEW: store Supabase error
          }
          return;
        }

        if (!data || data.length === 0) {
          // NEW: no hadiths found at all
          if (!isCancelled) {
            setHadith(null);                      // NEW: nothing to show
            setError(null);                       // no *error*, just empty
          }
          return;
        }

        const rows = data as HadithRow[];         // NEW: cast raw data to HadithRow[]

        // NEW: compute a deterministic "Hadith of the Day" index based on today's date
        const today = new Date();                 // current date
        const startOfYear = new Date(today.getFullYear(), 0, 0); // Jan 0 of this year
        const diffMs = today.getTime() - startOfYear.getTime();  // ms since year start
        const dayOfYear = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // convert ms -> days

        const index = dayOfYear % rows.length;    // NEW: wrap day number into the array length
        const chosen = rows[index];               // NEW: pick the hadith for today

        if (!isCancelled) {
          setHadith(chosen);                      // NEW: store chosen hadith
          setError(null);                         // clear any previous error
        }
      } catch (err) {
        if (!isCancelled) {
          const msg =
            err instanceof Error ? err.message : "Unknown error loading hadith";
          setError(msg);                          // NEW: store unknown error
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);                      // NEW: mark loading false at the end
        }
      }
    }

    fetchHadiths();                               // NEW: run once when component using this hook mounts

    return () => {
      isCancelled = true;                         // NEW: prevent setState if unmounted
    };
  }, []); // empty dependency array => run exactly once on mount

  return { hadith, loading, error };              // NEW: expose the data + status
}
