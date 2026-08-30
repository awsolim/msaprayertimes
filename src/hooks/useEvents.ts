// src/hooks/useEvents.ts
// Fetch upcoming events from your Proxy API.
// Refreshes only once per day (at midnight).

import { useEffect, useState } from "react";

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  place: string | null;
  start_at: string;
  end_at: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;

  // Jumuah-specific fields
  is_jumuah?: boolean;
  jumuah_first_start?: string;
  jumuah_first_end?: string;
  jumuah_second_start?: string | null;
  jumuah_second_end?: string | null;
};

// Shape of row in jumuah_settings table (from API response)
type JumuahSettingsRow = {
  id: string;
  title: string;
  description: string | null;
  weekday: number;
  first_start: string;
  first_end: string;
  second_start: string | null;
  second_end: string | null;
  place: string | null;
  is_active: boolean;
  updated_at: string;
};

function getNextWeekdayDate(weekday: number): Date {
  const now = new Date();
  const today = now.getDay();
  let diff = (weekday - today + 7) % 7;
  if (diff === 0) diff = 7; 
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  result.setDate(now.getDate() + diff);
  return result;
}

function combineDateAndTime(base: Date, timeStr: string | null): Date {
  if (!timeStr) throw new Error("combineDateAndTime: timeStr is null/empty");
  const parts = timeStr.split(":");
  if (parts.length < 2) throw new Error("combineDateAndTime: invalid time format " + timeStr);
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const s = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
  const d = new Date(base);
  d.setHours(h, m, s, 0);
  return d;
}

function buildJumuahEvent(row: JumuahSettingsRow | null): EventRow | null {
  if (!row) return null;
  const jumuahDate = getNextWeekdayDate(row.weekday);
  if (!row.first_start || !row.first_end) return null;

  const firstStart = combineDateAndTime(jumuahDate, row.first_start);
  const firstEnd = combineDateAndTime(jumuahDate, row.first_end);
  const secondStart = row.second_start ? combineDateAndTime(jumuahDate, row.second_start) : null;
  const secondEnd = row.second_end ? combineDateAndTime(jumuahDate, row.second_end) : null;
  const overallEnd = secondEnd ?? firstEnd;

  return {
    id: "jumuah-" + row.id,
    title: row.title,
    description: null,
    image_url: null,
    place: row.place,
    start_at: firstStart.toISOString(),
    end_at: overallEnd.toISOString(),
    is_active: true,
    created_at: firstStart.toISOString(),
    updated_at: row.updated_at,
    is_jumuah: true,
    jumuah_first_start: firstStart.toISOString(),
    jumuah_first_end: firstEnd.toISOString(),
    jumuah_second_start: secondStart ? secondStart.toISOString() : null,
    jumuah_second_end: secondEnd ? secondEnd.toISOString() : null,
  };
}

export default function useEvents(enabled = true) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    let timerId: number | undefined;

    const fetchEvents = async () => {
      if (isCancelled) return;

      try {
        setLoading(true);
        console.log("Fetching events from proxy...");

        const response = await fetch("/api/events");
        if (!response.ok) throw new Error("Failed to fetch events from proxy");

        const { events: baseEvents, jumuah } = await response.json();

        let jumuahEvent: EventRow | null = null;
        if (jumuah) {
          jumuahEvent = buildJumuahEvent(jumuah);
        }

        const merged = jumuahEvent ? [jumuahEvent, ...baseEvents] : baseEvents;
        
        if (!isCancelled) {
          setEvents(merged);
          setError(null);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Unknown error loading events");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }

      scheduleNextRefresh();
    };

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
        fetchEvents();
      }, msUntil);
    };

    fetchEvents();

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [enabled]);

  return { events, loading, error };
}
