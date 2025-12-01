// src/hooks/useEvents.ts
// Fetch upcoming events from Supabase and keep them updated in the background.
// Also inject a synthetic weekly Jumuah event (with both prayer times).

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// How often to refresh events (ms) – gentle for 24/7 display
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Normal events + optional Jumuah-specific fields
export type EventRow = {
  id: string;                 // unique ID
  title: string;              // event name
  description: string | null; // event description (ignored for Jumuah)
  image_url: string | null;   // poster/banner image URL (if any)
  place: string | null;       // where the event takes place
  start_at: string;           // ISO timestamp string for event start
  end_at: string;             // ISO timestamp string for event end
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;

  // --- Jumuah-specific fields (only set on the synthetic Jumuah event) ---
  is_jumuah?: boolean;                // true only for weekly Jumuah
  jumuah_first_start?: string;        // ISO for first prayer start
  jumuah_first_end?: string;          // ISO for first prayer end
  jumuah_second_start?: string | null;// ISO for second prayer start
  jumuah_second_end?: string | null;  // ISO for second prayer end
};

// Shape of row in jumuah_settings table
type JumuahSettingsRow = {
  id: string;
  title: string;
  description: string | null;
  weekday: number;             // 0=Sun..6=Sat (5 = Friday)
  first_start: string;         // "HH:MM:SS"
  first_end: string;           // "HH:MM:SS"
  second_start: string | null; // "HH:MM:SS" or null
  second_end: string | null;   // "HH:MM:SS" or null
  place: string | null;
  is_active: boolean;
  updated_at: string;
};

// Get upcoming date for a particular weekday (local time)
function getNextWeekdayDate(weekday: number): Date {
  const now = new Date();
  const today = now.getDay();
  let diff = (weekday - today + 7) % 7;
  if (diff === 0) diff = 7; // if same day, go to next week

  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  result.setDate(now.getDate() + diff);
  return result;
}

// Combine a base date + "HH:MM:SS" into a Date
function combineDateAndTime(base: Date, timeStr: string | null): Date {
  if (!timeStr) {
    throw new Error("combineDateAndTime: timeStr is null/empty");
  }

  const parts = timeStr.split(":");
  if (parts.length < 2) {
    throw new Error("combineDateAndTime: invalid time format " + timeStr);
  }

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const s = parts.length >= 3 ? parseInt(parts[2], 10) : 0;

  if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) {
    throw new Error("combineDateAndTime: NaN components for " + timeStr);
  }

  const d = new Date(base);
  d.setHours(h, m, s, 0);
  return d;
}

// Build the synthetic weekly Jumuah EventRow (or return null if bad config)
function buildJumuahEvent(row: JumuahSettingsRow | null): EventRow | null {
  if (!row) return null;

  const jumuahDate = getNextWeekdayDate(row.weekday);

  if (!row.first_start || !row.first_end) {
    console.error("Jumuah settings missing first_start/first_end", row);
    return null;
  }

  // Build all four times as Date objects
  const firstStart = combineDateAndTime(jumuahDate, row.first_start);   // first prayer start
  const firstEnd = combineDateAndTime(jumuahDate, row.first_end);       // first prayer end

  const secondStart = row.second_start
    ? combineDateAndTime(jumuahDate, row.second_start)
    : null;                                                              // second prayer start (optional)

  const secondEnd = row.second_end
    ? combineDateAndTime(jumuahDate, row.second_end)
    : null;                                                              // second prayer end (optional)

  const overallEnd = secondEnd ?? firstEnd;                              // end of last prayer

  if (
    Number.isNaN(firstStart.getTime()) ||
    Number.isNaN(firstEnd.getTime()) ||
    (secondStart && Number.isNaN(secondStart.getTime())) ||
    (secondEnd && Number.isNaN(secondEnd.getTime()))
  ) {
    console.error("Jumuah produced Invalid Date", {
      firstStart,
      firstEnd,
      secondStart,
      secondEnd,
      row,
    });
    return null;
  }

  return {
    id: "jumuah-" + row.id,
    title: row.title,
    description: null,                                  // we’ll render times instead of description
    image_url: null,
    place: row.place,
    start_at: firstStart.toISOString(),                 // used for date badge + overall range
    end_at: overallEnd.toISOString(),
    is_active: true,
    created_at: firstStart.toISOString(),
    updated_at: row.updated_at,

    // Jumuah-specific fields for the card to use
    is_jumuah: true,
    jumuah_first_start: firstStart.toISOString(),
    jumuah_first_end: firstEnd.toISOString(),
    jumuah_second_start: secondStart
      ? secondStart.toISOString()
      : null,
    jumuah_second_end: secondEnd ? secondEnd.toISOString() : null,
  };
}

export default function useEvents() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        setLoading(true);

        const nowIso = new Date().toISOString();

        // 1) Normal upcoming events
        const { data: evData, error: evError } = await supabase
          .from("events")
          .select("*")
          .gte("end_at", nowIso)
          .order("start_at", { ascending: true });

        if (evError) throw evError;
        const baseEvents = (evData || []) as EventRow[];

        // 2) Weekly Jumuah settings
        let jumuahEvent: EventRow | null = null;
        try {
          const { data: jData, error: jError } = await supabase
            .from("jumuah_settings")
            .select("*")
            .eq("is_active", true)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (jError) {
            console.error("Error loading jumuah_settings:", jError.message);
          } else if (jData) {
            jumuahEvent = buildJumuahEvent(jData as JumuahSettingsRow);
          }
        } catch (innerErr) {
          console.error("Failed to build Jumuah event:", innerErr);
        }

        const merged = jumuahEvent ? [jumuahEvent, ...baseEvents] : baseEvents;

        if (!cancelled) {
          setEvents(merged);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("useEvents error:", err);
          setError(err?.message || "Unknown error loading events");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchEvents();
    const intervalId = window.setInterval(fetchEvents, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return { events, loading, error };
}
