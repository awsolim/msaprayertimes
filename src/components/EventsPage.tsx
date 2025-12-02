// src/components/EventsPage.tsx
// A standalone events page that shows:
//  - The next 3 upcoming events (highlighted)
//  - A full calendar-style list of all upcoming events
// All times are shown in Edmonton (America/Edmonton) time.

import useEvents from "../hooks/useEvents";          // normal value import for the hook
import type { EventRow } from "../hooks/useEvents";  // type-only import for EventRow


// Helper function: format date in Edmonton time (e.g. "Tue, Mar 4, 2025")
function formatDateEdmonton(iso: string): string {
  // NEW: convert ISO string into Date, then format using America/Edmonton timezone
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton", // NEW: force Mountain Time (Edmonton)
    weekday: "short",             // NEW: e.g. "Tue"
    month: "short",               // NEW: e.g. "Mar"
    day: "numeric",               // NEW: e.g. "4"
    year: "numeric",              // NEW: e.g. "2025"
  }).format(new Date(iso));
}

// Helper function: format time in Edmonton time (e.g. "6:00 PM")
function formatTimeEdmonton(iso: string): string {
  // NEW: format only the time part in America/Edmonton
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton", // NEW: Mountain Time (Edmonton)
    hour: "numeric",              // NEW: hour like 6
    minute: "2-digit",            // NEW: minutes like "00"
  }).format(new Date(iso));
}

// Helper: build a combined "time range" string like "6:00 PM – 8:00 PM"
function formatTimeRange(startIso: string, endIso: string): string {
  // NEW: format start and end times, both in Edmonton
  const start = formatTimeEdmonton(startIso); // NEW: start time
  const end = formatTimeEdmonton(endIso);     // NEW: end time
  return `${start} – ${end}`;                 // NEW: "start – end"
}

export default function EventsPage() {
  // NEW: get upcoming events from Supabase via our hook
  const { events, loading, error } = useEvents();

  // NEW: derive the three most upcoming events (or fewer if < 3 exist)
  const topThree: EventRow[] = events.slice(0, 3);

  if (loading && events.length === 0) {
    // NEW: show loading only if we truly have no events yet
    return (
      <div className="p-8 text-center text-sky-200">
        Loading upcoming events…
      </div>
    );
  }

  if (error) {
    // NEW: error state if Supabase call failed
    return (
      <div className="p-8 text-center">
        <p className="text-2xl text-red-300">Unable to load events.</p>
        <p className="text-lg text-sky-300 mt-2">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    // NEW: friendly message if there are simply no upcoming events
    return (
      <div className="p-8 text-center">
        <p className="text-3xl text-sky-100 mb-4">
          No upcoming events at the moment.
        </p>
        <p className="text-xl text-sky-300">
          Please check back soon for new announcements.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10">
      {/* Section: 3 most upcoming events */}
      <section>
        <h1 className="text-4xl font-bold text-(--next) mb-4">
          Upcoming Highlights
        </h1>
        <div className="grid md:grid-cols-3 gap-6">
          {topThree.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl bg-black/30 border border-white/10 p-4 flex flex-col gap-2"
            >
              {/* Event title */}
              <h2 className="text-2xl font-semibold text-sky-50">
                {event.title}
              </h2>

              {/* Place */}
              {event.place && (
                <p className="text-sm text-sky-300">
                  📍 {event.place}
                </p>
              )}

              {/* Date + time range */}
              <p className="text-sm text-sky-200">
                {formatDateEdmonton(event.start_at)} ·{" "}
                {formatTimeRange(event.start_at, event.end_at)}
              </p>

              {/* Description */}
              {event.description && (
                <p className="text-sm text-sky-100 mt-2">
                  {event.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Section: calendar-style list of all upcoming events */}
      <section>
        <h2 className="text-3xl font-bold text-sky-100 mb-4">
          All Upcoming Events
        </h2>
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-stretch gap-4 rounded-2xl bg-black/25 border border-white/10 p-4"
            >
              {/* Date "badge" on the left */}
              <div className="flex flex-col items-center justify-center w-24 rounded-xl bg-black/40 border border-white/20 px-2 py-3">
                <span className="text-sm text-sky-300">
                  {new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Edmonton", // NEW: consistent Edmonton time
                    weekday: "short",
                  }).format(new Date(event.start_at))}
                </span>
                <span className="text-3xl font-bold text-sky-50">
                  {new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Edmonton", // NEW: Edmonton
                    day: "numeric",
                  }).format(new Date(event.start_at))}
                </span>
                <span className="text-xs text-sky-300">
                  {new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Edmonton", // NEW: Edmonton
                    month: "short",
                  }).format(new Date(event.start_at))}
                </span>
              </div>

              {/* Main content on the right */}
              <div className="-translate-x-5 flex-1 flex flex-col gap-1">
                {/* Title */}
                <h3 className="text-2xl font-semibold text-sky-50">
                  {event.title}
                </h3>

                {/* Place */}
                {event.place && (
                  <p className="text-sm  text-sky-300">
                    📍 {event.place}
                  </p>
                )}

                {/* Time range */}
                <p className="text-sm text-sky-200">
                  {formatTimeRange(event.start_at, event.end_at)}
                </p>

                {/* Description */}
                {event.description && (
                  <p className="text-sm text-sky-100 mt-1">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
