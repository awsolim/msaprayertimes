// src/components/RotatingSlides.tsx
// Rotates the bottom-right area between:
//   1) Next prayer countdown
//   2) Event slide
//   3) Hadith slide
// Now with a smooth fade transition between slides.

import { useEffect, useState } from "react"; // useState/useEffect to handle slide index + fade timing
import type { PrayerTimes } from "../hooks/usePrayerTimes"; // type for the prayer times object
import NextPrayerPanel from "./NextPrayerPanel"; // existing countdown component for next prayer

// Slides we cycle through, in order
const SLIDES = ["countdown", "event", "hadith"] as const; // tuple => "countdown" | "event" | "hadith"
type SlideKind = (typeof SLIDES)[number]; // union type of slide names

// How long each slide stays fully visible before transitioning (ms)
const DURATION = 5000; // 15 seconds per slide (you can tweak this)

// How long the fade animation lasts (ms)
const FADE_MS = 400; // 0.7 second fade in/out (matches Tailwind duration-700)

type Props = {
  prayerTimes: PrayerTimes; // full prayerTimes object passed to NextPrayerPanel
};

export default function RotatingSlides({ prayerTimes }: Props) {
  const [index, setIndex] = useState(0); // which slide in SLIDES is currently active
  const [fadeStage, setFadeStage] = useState<"in" | "out">("in"); // whether we are faded in or fading out

  useEffect(() => {
    // Set up variables so we can clear both interval + timeout on unmount
    let timeoutId: number | undefined; // timeout for the short fade-out → slide-change → fade-in step

    // Function that starts a fade-out and then switches the slide
    const startTransition = () => {
      // First: trigger fade-out
      setFadeStage("out");

      // After the fade duration, actually switch slide and fade back in
      timeoutId = window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % SLIDES.length); // go to next slide, wrapping around
        setFadeStage("in"); // fade the new slide in
      }, FADE_MS);
    };

    // Interval that fires every DURATION ms to start a new transition
    const intervalId = window.setInterval(startTransition, DURATION);

    // Clean up both the interval and the last timeout when component unmounts
    return () => {
      window.clearInterval(intervalId);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const slide: SlideKind = SLIDES[index]; // label of the currently active slide
  const opacityClass = fadeStage === "in" ? "opacity-100" : "opacity-0"; // class to control visible/hidden for the fade

  return (
    // Wrapper fills the space and applies the fade transition to whatever slide is inside
    <div
      className={
        "w-full h-full flex flex-col items-center justify-center relative " + // layout: center content
        "transition-opacity duration-700 ease-out " + // animate opacity over 700ms
        opacityClass // either fully visible or fully transparent based on fadeStage
      }
    >
      {/* Slide 1: normal next-prayer countdown */}
      {slide === "countdown" && (
        <NextPrayerPanel prayerTimes={prayerTimes} /> // reuse your existing countdown as-is
      )}

      {/* Slide 2: static example event (for now) */}
      {slide === "event" && <EventSlide />}

      {/* Slide 3: static example hadith (for now) */}
      {slide === "hadith" && <HadithSlide />}
    </div>
  );
}

// ─────────────────────────────
// EVENT SLIDE (placeholder)
// ─────────────────────────────

function EventSlide() {
  // Temporary hard-coded event; later we can fetch this from Supabase
  const event = {
    title: "MSA Weekly Halaqah", // event title text
    description: "Every Friday after Maghrib in the prayer hall.", // event description text
    imageUrl: "/events/halaqah.png", // path to event image (update to match your actual file)
  };

  return (
    <div className="text-center px-6">
      {/* Event image above title/description */}
      <img
        src={event.imageUrl}
        alt={event.title}
        className="mx-auto max-h-64 object-contain drop-shadow-xl mb-8" // limit height and add a soft shadow
      />

      {/* Event title using your accent color */}
      <h2 className="text-5xl font-bold text-(--next) mb-4">
        {event.title}
      </h2>

      {/* Event description in a readable size */}
      <p className="text-2xl text-sky-100 leading-relaxed">
        {event.description}
      </p>
    </div>
  );
}

// ─────────────────────────────
// HADITH SLIDE (placeholder)
// ─────────────────────────────

function HadithSlide() {
  // Temporary hadith text; later can be made dynamic
  const hadith = {
    text: "The most beloved deeds to Allah are those done consistently, even if small.", // hadith text
    ref: "Bukhari & Muslim", // reference/source of the hadith
  };

  return (
    <div className="text-center px-6 max-w-3xl mx-auto">
      {/* Main hadith text */}
      <p className="text-3xl text-sky-100 leading-relaxed mb-6">
        {hadith.text}
      </p>

      {/* Reference line */}
      <p className="text-xl text-sky-300">
        — {hadith.ref}
      </p>
    </div>
  );
}
