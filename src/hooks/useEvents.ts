// src/hooks/useEvents.ts
// Fetch all active, upcoming events from Supabase once,
// and expose them as a list for the UI to reuse.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient"; // shared Supabase client

// Shape of a row from the events table
export type EventRow = {
  id: string;                 // UUID
  title: string;              // event title (required)
  description: string | null; // event description (optional)
  image_url: string | null;   // URL to banner/poster image
  start_at: string | null;    // ISO timestamp (string from Supabase)
  end_at: string | null;      // ISO timestamp (string from Supabase)
  is_active: boolean;         // whether the event should be shown
};

type UseEventsResult = {
  events: EventRow[];   // list of active events (possibly empty)
  loading: boolean;     // true while the initial fetch is running
  error: string | null; // error message if something goes wrong
};

export default function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<EventRow[]>([]);     // cached events list
  const [loading, setLoading] = useState(true);             // loading state
  const [error, setError] = useState<string | null>(null);  // error state

  useEffect(() => {
    let isCancelled = false; // guard so we don't set state after unmount

    async function fetchEvents() {
      setLoading(true);
      setError(null);

      // Basic strategy:
      // 1) only active events
      // 2) whose end_at is in the future OR null
      // 3) ordered by start_at so nearest events come first
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .or("end_at.is.null,end_at.gt.now()")
        .order("start_at", { ascending: true });

      if (isCancelled) return; // skip if hook was unmounted mid-fetch

      if (error) {
        console.error("Failed to fetch events:", error);
        setError(error.message);
        setEvents([]);
      } else if (data) {
        setEvents(data as EventRow[]);
      }

      setLoading(false);
    }

    fetchEvents(); // run once on mount

    return () => {
      isCancelled = true; // mark that we shouldn't update state anymore
    };
  }, []);

  return { events, loading, error };
}
