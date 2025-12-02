// src/components/RotatingSlides.tsx
// Rotates the bottom-right area between:
//   1) Next prayer countdown
//   2) Events slide (up to 4 upcoming events, 2 at a time + QR section)
//   3) Hadith slide (from Supabase: hadith of the day)
//
// Right column content is constrained to its own area so it doesn't
// push the overall layout taller (helps keep the left table visually fixed).

import { useEffect, useState } from "react";
import type { PrayerTimes } from "../hooks/usePrayerTimes";
import NextPrayerPanel from "./NextPrayerPanel";
import useEvents from "../hooks/useEvents";
import type { EventRow } from "../hooks/useEvents";
import useHadith from "../hooks/useHadith"; // NEW: hook to load hadith from Supabase
import type { HadithRow } from "../hooks/useHadith"; // NEW: type for hadith rows
import qrCode from "../assets/qrcode.png"; // QR image for "Sign Up for Events" section
import pbuhIcon from "../assets/pbuh.png";
import locationPin from "../assets/location.png";

// All possible slide types in the global rotation
type SlideKind = "countdown" | "event" | "hadith";

// Ordered list of slides we rotate through
const SLIDES: SlideKind[] = ["countdown", "event", "hadith"];

// How long each slide stays fully visible before transitioning (ms)
const DURATION = 10000; // 10 seconds per slide so event slide can show 2 pages

// How long the fade animation lasts (ms)
const FADE_MS = 400; // 0.7 second fade duration

// Debug freeze mode: when true, disable rotation and lock onto one slide
const DEBUG_FREEZE = false;

// Which slide to show when DEBUG_FREEZE is true
const DEBUG_SLIDE: SlideKind = "countdown";

type Props = {
  prayerTimes: PrayerTimes;
};

export default function RotatingSlides({ prayerTimes }: Props) {
  const [index, setIndex] = useState(0);
  const [fadeStage, setFadeStage] = useState<"in" | "out">("in");

  // Events from Supabase (already set up elsewhere)
  const {
    events,
    loading: loadingEvents,
    error: eventsError,
  } = useEvents();

  // NEW: Hadith-of-the-day from Supabase, loaded once here
  const {
    hadith,
    loading: loadingHadith,
    error: hadithError,
  } = useHadith(); // NEW: central place where hadith is fetched and cached

  // ─────────────────────────────────────────────
  // DEBUG FREEZE: lock onto a specific slide, no rotation or fading
  // ─────────────────────────────────────────────
  if (DEBUG_FREEZE) {
    const activeSlide: SlideKind = DEBUG_SLIDE;

    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        {activeSlide === "countdown" && (
          <NextPrayerPanel prayerTimes={prayerTimes} />
        )}

        {activeSlide === "event" && (
          <EventSlide
            events={events}
            loading={loadingEvents}
            error={eventsError}
          />
        )}

        {activeSlide === "hadith" && (
          <HadithSlide
            hadith={hadith}          // NEW: pass hadith data down
            loading={loadingHadith}  // NEW: pass loading flag
            error={hadithError}      // NEW: pass error message
          />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // NORMAL MODE: automatic rotation + fading
  // ─────────────────────────────────────────────

  useEffect(() => {
    let timeoutId: number | undefined;

    const startTransition = () => {
      setFadeStage("out");

      timeoutId = window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % SLIDES.length);
        setFadeStage("in");
      }, FADE_MS);
    };

    const intervalId = window.setInterval(startTransition, DURATION);

    return () => {
      window.clearInterval(intervalId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  const slideFromIndex: SlideKind = SLIDES[index];
  const opacityClass = fadeStage === "in" ? "opacity-100" : "opacity-0";

  return (
    <div
      className={
        "w-full h-full relative " +
        "flex flex-col items-center justify-center " +
        "transition-opacity duration-700 ease-out " +
        "overflow-y-auto " + // content scrolls inside right panel only
        opacityClass
      }
    >
      {slideFromIndex === "countdown" && (
        <NextPrayerPanel prayerTimes={prayerTimes} />
      )}

      {slideFromIndex === "event" && (
        <EventSlide
          events={events}
          loading={loadingEvents}
          error={eventsError}
        />
      )}

      {slideFromIndex === "hadith" && (
        <HadithSlide
          hadith={hadith}          // NEW: use Supabase hadith in normal mode
          loading={loadingHadith}
          error={hadithError}
        />
      )}
    </div>
  );
}

// ─────────────────────────────
// EVENT SLIDE
// ─────────────────────────────

type EventSlideProps = {
  events: EventRow[];
  loading: boolean;
  error: string | null;
};

function EventSlide({ events, loading, error }: EventSlideProps) {
  const [page, setPage] = useState(0); // 0 = events 1–2, 1 = events 3–4

  if (loading && events.length === 0) {
    return (
      <div className="text-center px-10">
        <p className="text-4xl text-sky-200">Loading upcoming events…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center px-10">
        <p className="text-4xl text-red-300">Unable to load events.</p>
        <p className="text-2xl text-sky-300 mt-4">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center px-10">
        <p className="text-5xl text-sky-100 mb-6">
          No upcoming events at the moment.
        </p>
        <p className="text-3xl text-sky-300">
          Please stay tuned for announcements.
        </p>
      </div>
    );
  }

  const fourEvents = events.slice(0, 4); // only the first 4 upcoming events
  const PER_PAGE = 2; // 2 rows per page
  const maxPages = Math.ceil(fourEvents.length / PER_PAGE) || 1;
  const safePage = Math.min(page, maxPages - 1);
  const startIndex = safePage * PER_PAGE;
  const visibleEvents = fourEvents.slice(startIndex, startIndex + PER_PAGE);

  useEffect(() => {
    setPage(0); // reset when events change
  }, [events.length]);

  useEffect(() => {
    if (maxPages <= 1) return;

    const intervalId = window.setInterval(() => {
      setPage((prev) => (prev + 1) % maxPages);
    }, 5000); // 5s per page

    return () => window.clearInterval(intervalId);
  }, [maxPages]);

  return (
    <div className="w-full h-full flex flex-col justify-between px-10 py-6">
      {/* TOP: section title + up to 2 event cards */}
      <div className="flex flex-col items-center">
        <h2 className="text-6xl md:text-7xl font-extrabold text-(--next) mb-8">
          Upcoming Events
        </h2>

        <div className="w-full max-w-6xl space-y-6">
          {visibleEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}

          {/* placeholder row if this page only has 1 event, to keep height fixed */}
          {visibleEvents.length < PER_PAGE && (
            <div
              className="
                flex
                gap-6
                rounded-3xl
                bg-black/40
                border border-white/25
                px-6 py-5
                opacity-0
                pointer-events-none
              "
            >
              <div
                className="
                  flex flex-col items-center justify-center
                  w-40
                  rounded-2xl
                  bg-black/60
                  border border-white/30
                  px-6 py-5
                "
              >
                <span className="text-2xl">--</span>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <h3 className="text-3xl md:text-4xl font-bold">Placeholder</h3>
                <p className="text-2xl">Placeholder</p>
                <p className="text-2xl">Placeholder</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM: QR code + sign-up text */}
      <div className="mt-6 flex items-center justify-center gap-8">
        <img
          src={qrCode}
          alt="Sign up for events QR code"
          className="w-35 h-35 md:w-35 md:h-35 rounded-2xl border border-white/30"
        />

        <div className="text-left">
          <p className="text-4xl md:text-5xl font-extrabold text-(--next)">
            Sign Up for Events
          </p>
          <p className="text-2xl md:text-3xl text-sky-100 mt-2 leading-snug">
            Scan the QR code to visit our Linktree.
          </p>
        </div>
      </div>
    </div>
  );
}

// Single event card
function EventCard({ event }: { event: EventRow }) {
  // Flag to know if this is the synthetic weekly Jumuah event
  const isJumuah = event.is_jumuah === true;

  return (
    <div
      className="
        flex
        gap-6
        rounded-3xl
        bg-black/40
        
        border border-white/25
        px-6 py-5
      "
    >
      {/* Date badge on the left */}
      <div
        className="
          flex flex-col items-center justify-center
          ml-4 
          rounded-2xl
          bg-sky-950/80
          border border-sky-400/60
          px-9 py-px
        "
      >
        <span className="text-lg uppercase tracking-[0.2em] text-emerald-200">
          {new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Edmonton",
            weekday: "short",
          }).format(new Date(event.start_at))}
        </span>

        <span className="text-5xl font-extrabold text-sky-50 leading-none">
          {new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Edmonton",
            day: "numeric",
          }).format(new Date(event.start_at))}
        </span>

        <span className="text-2xl text-sky-300 -mt-1">
          {new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Edmonton",
            month: "short",
          }).format(new Date(event.start_at))}
        </span>
      </div>

      {/* Right column: title, location, times, description */}
      <div className="flex-1 flex flex-col gap-3 items-center mr-12">
        <h3 className="text-3xl md:text-4xl font-bold text-sky-50">
          {event.title}
        </h3>

        {/* Location line */}
        <p className="text-2xl text-sky-200 flex flex-wrap gap-3">
          {event.place && (
            <span className="flex items-center gap-2 text-sky-300">
  <img
    src={locationPin}
    alt="Location"
    className="w-6 h-6 object-contain inline-block"
  />
  {event.place}
</span>

          )}

          {/* For non-Jumuah events, show single time range inline */}
          {!isJumuah && event.start_at && event.end_at && (
            <span className="text-sky-200">
              • {formatTimeRangeEdmonton(event.start_at, event.end_at)}
            </span>
          )}
        </p>

        {/* Jumuah: show two stacked time ranges instead of description */}
        {isJumuah && (
          <div className="mt-1 flex flex-col gap-1 text-2xl text-sky-200">
            {event.jumuah_first_start && event.jumuah_first_end && (
              <div>
                First Prayer{" "}
                {formatTimeRangeEdmonton(
                  event.jumuah_first_start,
                  event.jumuah_first_end
                )}
              </div>
            )}

            {event.jumuah_second_start && event.jumuah_second_end && (
              <div>
                Second Prayer{" "}
                {formatTimeRangeEdmonton(
                  event.jumuah_second_start,
                  event.jumuah_second_end
                )}
              </div>
            )}
          </div>
        )}

        {/* Normal events: keep showing description */}
        {!isJumuah && event.description && (
          <p className="text-2xl text-sky-100 leading-relaxed">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────
// HADITH SLIDE (from Supabase)
// ─────────────────────────────

type HadithSlideProps = {
  hadith: HadithRow | null;  // NEW: hadith row from Supabase or null if none
  loading: boolean;          // NEW: whether the hadith is still loading
  error: string | null;      // NEW: error message from Supabase, if any
};

function HadithSlide({ hadith, loading, error }: HadithSlideProps) {
  // NEW: show loading only when we truly have nothing yet
  if (loading && !hadith && !error) {
    return (
      <div className="text-center px-6 max-w-3xl mx-auto">
        <p className="text-3xl text-sky-200">Loading hadith of the day…</p>
      </div>
    );
  }

  // NEW: show error state
  if (error) {
    return (
      <div className="text-center px-6 max-w-3xl mx-auto">
        <p className="text-3xl text-red-300">Unable to load hadith.</p>
        <p className="text-xl text-sky-300 mt-2">{error}</p>
      </div>
    );
  }

  // NEW: no hadith configured
  if (!hadith) {
    return (
      <div className="text-center px-6 max-w-3xl mx-auto">
        <p className="text-3xl text-sky-200">
          No hadiths are configured yet. Please add some in Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6">
      {/* NEW: Big title for hadith section */}
      <h2 className="text-6xl md:text-7xl font-extrabold text-amber-100 mb-8">
        Hadith of the Day
      </h2>

      <p className="text-3xl md:text-4xl text-sky-100 font-semibold mb-6 flex items-center justify-center gap-3">
  <span>The Messenger of Allah</span>
  <img
    src={pbuhIcon}
    alt="ﷺ"
    className="w-15 h-15 object-contain inline-block"
  />
  <span>said:</span>
</p>

 {/* Arabic text */}
        <p className="text-4xl md:text-5xl text-(--next) leading-relaxed mb-6">
          {hadith.arabic_text}
        </p>

        {/* English translation */}
        <p className="text-center text-2xl md:text-3xl text-sky-100 leading-relaxed mb-8">
          {hadith.english_text}
        </p>

        {/* Narrator and source */}
        <p className="text-xl md:text-2xl text-sky-200 mb-1">
          Narrated by: {hadith.narrator}
        </p>
        <p className="text-lg md:text-xl text-sky-300">
          Source: {hadith.source}
        </p>

    </div>
  );
}

// ─────────────────────────────
// Helper: format a time range in Edmonton time
// ─────────────────────────────

function formatTimeRangeEdmonton(startIso: string, endIso: string): string {
  // Parse the incoming ISO strings into Date objects
  const startDate = new Date(startIso); // Date for start
  const endDate = new Date(endIso);     // Date for end

  // If either date is invalid, avoid throwing and just log + return blank
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    console.error("formatTimeRangeEdmonton: invalid dates", {
      startIso,
      endIso,
    });
    return ""; // UI will just not show a range instead of crashing
  }

  // Reuse a formatter in Edmonton time for both start and end
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    hour: "numeric",
    minute: "2-digit",
  });

  const start = formatter.format(startDate); // pretty start time
  const end = formatter.format(endDate);     // pretty end time

  return `${start} – ${end}`; // "12:20 PM – 1:30 PM"
}

