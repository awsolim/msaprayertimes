// src/components/RotatingSlides.tsx
// Rotates the bottom-right area between:
//   1) Next prayer countdown
//   2) Event slide (from Supabase, multiple events supported)
//   3) Hadith slide
// Includes a smooth fade transition in normal mode, and a debug "freeze"
// mode that locks the screen on any one slide *without* any fading.

import { useEffect, useState } from "react"; // useState/useEffect for timing and transitions
import type { PrayerTimes } from "../hooks/usePrayerTimes"; // type for prayer times object
import NextPrayerPanel from "./NextPrayerPanel"; // existing countdown component
import useEvents from "../hooks/useEvents"; // hook that fetches all events once
import type { EventRow } from "../hooks/useEvents"; // type-only import for events rows

// All possible slide types
type SlideKind = "countdown" | "event" | "hadith";

// Ordered list of slides we rotate through
const SLIDES: SlideKind[] = ["countdown", "event", "hadith"];

// How long each slide stays fully visible before transitioning (ms) in normal mode
const DURATION = 2000; // 15 seconds per slide

// How long the fade animation lasts (ms) in normal mode
const FADE_MS = 700; // 0.7 second fade duration

// ─────────────────────────────────────────────
// DEBUG FREEZE CONFIG
// ─────────────────────────────────────────────
// When true, rotation + fading are completely disabled and we lock onto
// a single slide chosen by DEBUG_SLIDE. This is for testing formatting.
const DEBUG_FREEZE = true; // set to true when you want to freeze

// Which slide to show when frozen. Valid options: "countdown" | "event" | "hadith"
const DEBUG_SLIDE: SlideKind = "event";

type Props = {
  prayerTimes: PrayerTimes; // full prayer times object passed to countdown slide
};

export default function RotatingSlides({ prayerTimes }: Props) {
  // State used only in normal rotation mode
  const [index, setIndex] = useState(0); // which SLIDES[index] is active
  const [fadeStage, setFadeStage] = useState<"in" | "out">("in"); // whether current slide is faded in or out

  // Events are always fetched once so they are available for both normal + freeze modes
  const {
    events,
    loading: loadingEvents,
    error: eventsError,
  } = useEvents(); // fetch active events from Supabase

  const [eventIndex, setEventIndex] = useState(0); // which event in "events" to show in normal mode
  const [eventCycles, setEventCycles] = useState(0); // number of times we've shown the event slide

  // ─────────────────────────────────────────────
  // FROZEN MODE: return immediately with no fading or rotation
  // ─────────────────────────────────────────────
  if (DEBUG_FREEZE) {
    // Slide we want to lock onto while frozen
    const activeSlide: SlideKind = DEBUG_SLIDE;

    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        {/* Static countdown view */}
        {activeSlide === "countdown" && (
          <NextPrayerPanel prayerTimes={prayerTimes} /> // reuse existing countdown panel
        )}

        {/* Static event view (no rotation, no fade) */}
        {activeSlide === "event" && (
          <EventSlide
            events={events} // use whichever events have been fetched so far
            loading={loadingEvents}
            error={eventsError}
            currentIndex={0} // always show first event while frozen
          />
        )}

        {/* Static hadith view */}
        {activeSlide === "hadith" && <HadithSlide />}
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // NORMAL MODE: automatic rotation + fading
  // ─────────────────────────────────────────────

  // This effect sets up the periodic fade + slide-change timer
  useEffect(() => {
    let timeoutId: number | undefined; // timeout used between fade-out and actual slide switch

    // Called at each interval: fade out, then after FADE_MS switch slide + fade in
    const startTransition = () => {
      setFadeStage("out"); // start fade-out

      timeoutId = window.setTimeout(() => {
        // After fade-out completes, move to next slide and fade in again
        setIndex((prev) => (prev + 1) % SLIDES.length); // cycle index 0→1→2→0...
        setFadeStage("in"); // bring new slide into view
      }, FADE_MS);
    };

    const intervalId = window.setInterval(startTransition, DURATION); // run every DURATION ms

    // Cleanup interval + timeout when component unmounts
    return () => {
      window.clearInterval(intervalId);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  // Determine which slide name corresponds to current index
  const slideFromIndex: SlideKind = SLIDES[index];

  // When we land on the event slide and have multiple events, rotate through them
  useEffect(() => {
    if (slideFromIndex === "event" && events.length > 0) {
      if (eventCycles === 0) {
        // First time: just mark that we've shown the event slide once
        setEventCycles(1);
      } else {
        // Subsequent times: advance to the next event item
        setEventIndex((prev) => (prev + 1) % events.length);
      }
    }
  }, [slideFromIndex, events.length, eventCycles]);

  // Choose opacity class based on whether we are currently fading in or out
  const opacityClass = fadeStage === "in" ? "opacity-100" : "opacity-0";

  return (
    <div
      className={
        "w-full h-full flex flex-col items-center justify-center relative " + // layout container
        "transition-opacity duration-700 ease-out " + // smooth fade animation
        opacityClass // either fully visible or fully transparent
      }
    >
      {/* Slide 1: countdown to next prayer */}
      {slideFromIndex === "countdown" && (
        <NextPrayerPanel prayerTimes={prayerTimes} />
      )}

      {/* Slide 2: event slide showing current eventIndex */}
      {slideFromIndex === "event" && (
        <EventSlide
          events={events}
          loading={loadingEvents}
          error={eventsError}
          currentIndex={eventIndex}
        />
      )}

      {/* Slide 3: hadith slide */}
      {slideFromIndex === "hadith" && <HadithSlide />}
    </div>
  );
}

// ─────────────────────────────
// EVENT SLIDE (uses pre-fetched events)
// ─────────────────────────────

type EventSlideProps = {
  events: EventRow[];   // list of active events from Supabase
  loading: boolean;     // true while initial events fetch is in-flight
  error: string | null; // error message if loading fails
  currentIndex: number; // which event in the array we should display
};

function EventSlide({ events, loading, error, currentIndex }: EventSlideProps) {
  // If we are still fetching and have nothing yet, show a simple loading message
  if (loading && events.length === 0) {
    return (
      <div className="text-center px-6">
        <p className="text-2xl text-sky-200">Loading upcoming events…</p>
      </div>
    );
  }

  // If the Supabase query failed, show an error message
  if (error) {
    return (
      <div className="text-center px-6">
        <p className="text-2xl text-red-300">Unable to load events.</p>
        <p className="text-lg text-sky-300 mt-2">{error}</p>
      </div>
    );
  }

  // If there are no active events at all, show a friendly fallback
  if (events.length === 0) {
    return (
      <div className="text-center px-6">
        <p className="text-3xl text-sky-100 mb-4">
          No upcoming events at the moment.
        </p>
        <p className="text-xl text-sky-300">
          Please stay tuned for announcements.
        </p>
      </div>
    );
  }

  // Make sure currentIndex is in-bounds even if events length changes
  const safeIndex =
    ((currentIndex % events.length) + events.length) % events.length; // wrap into [0, events.length)
  const event = events[safeIndex]; // choose the event to display

  return (
    <div className="text-center px-6">

      {/* Event title */}
      <h2 className="text-5xl font-bold text-(--next) mt-4 mb-4">
        {event.title}
      </h2>

      {/* Event description if provided */}
      {event.description && (
        <p className="text-2xl text-sky-100 leading-relaxed">
          {event.description}
        </p>
      )}

      {/* Optional event poster/banner */}
      {event.image_url && (
        <img
          src={event.image_url}
          alt={event.title}
          className="mx-auto h-120 object-contain drop-shadow-xl mt-4 mb-8"
        />
      )}

      

      
    </div>
  );
}

// ─────────────────────────────
// HADITH SLIDE (simple placeholder)
// ─────────────────────────────

function HadithSlide() {
  const hadith = {
    text: "The most beloved deeds to Allah are those done consistently, even if small.",
    ref: "Bukhari & Muslim",
  };

  return (
    <div className="text-center px-6 max-w-3xl mx-auto">
      <p className="text-3xl text-sky-100 leading-relaxed mb-6">
        {hadith.text}
      </p>
      <p className="text-xl text-sky-300">— {hadith.ref}</p>
    </div>
  );
}
