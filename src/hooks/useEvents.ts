// src/hooks/useEvents.ts
// Fetch upcoming events from Supabase and keep them updated in the background.
// - Only events whose end_at is in the future are returned (upcoming).
// - Events are sorted by start_at ascending.
// - Polls every 10 minutes, *not* every slide cycle.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient"; // shared Supabase client

// How often to refresh events (ms) – gentle for a 24/7 display.
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Shape of a row in the "events" table.
export type EventRow = {
  id: string;                 // unique ID
  title: string;              // event name (e.g. "Weekly Halaqah")
  description: string | null; // event description / details
  image_url: string | null;   // poster/banner image URL (if any)
  place: string | null;       // NEW: where the event takes place (e.g. "HUB MSA room")
  start_at: string;           // ISO timestamp string for event start
  end_at: string;             // ISO timestamp string for event end
  is_active?: boolean;        // optional: can use to disable events
  created_at?: string;        // timestamp of insertion (not required for our logic)
};

export default function useEvents() {
  // List of upcoming events.
  const [events, setEvents] = useState<EventRow[]>([]); // NEW: store upcoming events

  // Loading state (mainly for the very first fetch).
  const [loading, setLoading] = useState<boolean>(true); // NEW: track loading

  // Error message, if any.
  const [error, setError] = useState<string | null>(null); // NEW: track error

  useEffect(() => {
    let isCancelled = false;         // NEW: guard to avoid setState after unmount
    let intervalId: number | null = null; // NEW: store polling interval ID

    // NEW: helper to fetch upcoming events from Supabase
    async function fetchEvents() {
      try {
        setLoading(true); // NEW: mark as loading while talking to Supabase

        const nowIso = new Date().toISOString(); // NEW: current time for upcoming filter

        // NEW: query upcoming events, ordered by start_at
        const { data, error: supabaseError } = await supabase
          .from("events")                     // events table
          .select("*")                        // get all columns
          .gte("end_at", nowIso)              // only events whose end time is >= now (upcoming)
          .order("start_at", { ascending: true }); // soonest events first

        if (supabaseError) {
          // NEW: handle Supabase error
          if (!isCancelled) {
            setError(supabaseError.message);
          }
          return;
        }

        if (!data) {
          // NEW: no data returned (rare)
          if (!isCancelled) {
            setEvents([]);  // clear events
            setError(null); // no error, just empty
          }
          return;
        }

        const rows = data as EventRow[]; // NEW: cast raw rows to EventRow[]

        if (!isCancelled) {
          setEvents(rows); // NEW: store upcoming events list
          setError(null);  // clear any previous error
        }
      } catch (err) {
        if (!isCancelled) {
          const msg =
            err instanceof Error ? err.message : "Unknown error loading events";
          setError(msg); // NEW: generic error
        }
      } finally {
        if (!isCancelled) {
          setLoading(false); // NEW: done loading (for this fetch)
        }
      }
    }

    fetchEvents(); // NEW: initial fetch when the hook is first used

    // NEW: set up background polling to refresh upcoming events periodically
    intervalId = window.setInterval(() => {
      fetchEvents(); // refresh events in background
    }, POLL_INTERVAL_MS);

    // NEW: cleanup when the component using this hook unmounts
    return () => {
      isCancelled = true;            // prevent late setState calls
      if (intervalId !== null) {
        window.clearInterval(intervalId); // stop polling
      }
    };
  }, []); // run once on mount

  return { events, loading, error }; // same API as before
}
