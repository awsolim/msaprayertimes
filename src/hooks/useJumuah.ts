// src/hooks/useJumuah.ts
// Fetch the active Jumuah settings from Supabase and refresh occasionally.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Shape of the row in "jumuah_settings"
export type JumuahSettings = {
  id: string;                   // unique ID for this settings row
  title: string;                // e.g. "Jumuah on Campus"
  place: string | null;         // location (optional)
  description: string | null;   // text that includes both prayer times
  weekday: number;              // 0=Sunday ... 5=Friday
  first_start: string;          // "HH:MM:SS" (Postgres time)
  first_end: string;            // "HH:MM:SS"
  second_start: string | null;  // "HH:MM:SS" or null if only one khutbah
  second_end: string | null;    // "HH:MM:SS" or null
  is_active: boolean;           // whether this settings row is in use
  updated_at: string;           // last time settings were changed
};

// Gentle polling interval (ms) – same spirit as events hook
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export default function useJumuah() {
  const [jumuah, setJumuah] = useState<JumuahSettings | null>(null); // holds settings row
  const [loading, setLoading] = useState(true);                       // loading flag
  const [error, setError] = useState<string | null>(null);           // error message, if any

  useEffect(() => {
    let isCancelled = false;        // prevents state updates after unmount
    let intervalId: number | null = null; // stores polling timer ID

    const fetchJumuah = async () => {
      // start loading state for this fetch
      setLoading(true);

      const { data, error } = await supabase
        .from("jumuah_settings")        // table name in Supabase
        .select("*")                    // grab all columns
        .eq("is_active", true)          // only active config
        .order("updated_at", { ascending: false }) // newest row first
        .limit(1)                       // we only care about one
        .maybeSingle();                 // return row or null

      // stop if component using this hook has unmounted
      if (isCancelled) return;

      if (error) {
        // store the error so UI can show a message
        setError(error.message);
      } else {
        // clear previous error (if any) and store the row
        setError(null);
        setJumuah(data ?? null);
      }

      // mark loading done for this round
      setLoading(false);
    };

    // initial fetch when component mounts
    fetchJumuah();

    // set up background polling to pick up changes
    intervalId = window.setInterval(fetchJumuah, POLL_INTERVAL_MS);

    // cleanup when component unmounts
    return () => {
      isCancelled = true;                   // block late state updates
      if (intervalId !== null) {
        window.clearInterval(intervalId);   // stop polling timer
      }
    };
  }, []); // empty deps → run once on mount

  // expose settings, loading, and error to callers
  return { jumuah, loading, error };
}
