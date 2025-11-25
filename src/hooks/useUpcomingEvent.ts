// src/hooks/useUpcomingEvent.ts
// Fetch a single "upcoming" active event from Supabase for the event slide.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient"; // shared Supabase client

// TypeScript description of the events table row shape
export type EventRow = {
  id: string;                 // UUID of the event
  title: string;              // event title
  description: string | null; // event description text
  image_url: string | null;   // URL for poster/banner image
  start_at: string | null;    // ISO timestamp strings
  end_at: string | null;
  is_active: boolean;         // whether this event should be displayed
};

type UseUpcomingEventResult = {
  event: EventRow | null; // the event to display (or null if none)
  loading: boolean;       // true while request is in-flight
  error: string | null;   // error message if something went wrong
};

export default function useUpcomingEvent(): UseUpcomingEventResult {
  const [event, setEvent] = useState<EventRow | null>(null); // single event row
  const [loading, setLoading] = useState(true);              // loading state
  const [error, setError] = useState<string | null>(null);   // error text

  useEffect(() => {
    let isCancelled = false; // flag to avoid state updates after unmount

    async function fetchEvent() {
      setLoading(true);
      setError(null);

      // Basic strategy:
      // 1) Only active events
      // 2) Prefer events whose end_at is in the future OR end_at is null
      // 3) Order by start_at ascending (soonest first)
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .or("end_at.is.null,end_at.gt.now()")
        .order("start_at", { ascending: true })
        .limit(1);

      if (isCancelled) return; // ignore result if hook unmounted

      if (error) {
        console.error("Failed to fetch upcoming event:", error);
        setError(error.message);
        setEvent(null);
      } else if (data && data.length > 0) {
        setEvent(data[0] as EventRow);
      } else {
        setEvent(null); // no upcoming event found
      }

      setLoading(false);
    }

    fetchEvent(); // run once on mount

    return () => {
      isCancelled = true; // mark hook as unmounted
    };
  }, []);

  return { event, loading, error };
}
