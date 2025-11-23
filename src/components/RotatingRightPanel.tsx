// src/components/RotatingRightPanel.tsx
// Wraps the right side content: keeps DateTimePanel at the top,
// and cycles the bottom area between:
//   1) NextPrayerPanel (countdown)
//   2) Event slide
//   3) Hadith-of-the-day slide

import { useEffect, useState } from "react";
import type { PrayerTimes } from "../hooks/usePrayerTimes";
import DateTimePanel from "./DateTimePanel";
import NextPrayerPanel from "./NextPrayerPanel";

// Define the three slide types this panel can show
type SlideKind = "countdown" | "event" | "hadith";

// Order in which slides will rotate
const SLIDE_ORDER: SlideKind[] = ["countdown", "event", "hadith"];

// How long each slide stays on screen (in milliseconds)
const SLIDE_DURATION_MS = 2000;

type Props = {
  prayerTimes: PrayerTimes; // full prayer times object for the countdown slide
};

export default function RotatingRightPanel({ prayerTimes }: Props) {
  const [activeIndex, setActiveIndex] = useState(0); // which slide in SLIDE_ORDER is currently active

  useEffect(() => {
    // Set up an interval to move to the next slide every SLIDE_DURATION_MS
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDE_ORDER.length); // cycle 0 -> 1 -> 2 -> 0 -> ...
    }, SLIDE_DURATION_MS);

    // Clean up the interval when component unmounts to avoid memory leaks
    return () => clearInterval(id);
  }, []);

  // Figure out which logical slide we should show right now
  const activeSlide = SLIDE_ORDER[activeIndex];

  return (
    // Full right-hand column: top is DateTimePanel, bottom is the rotating content
    <div className="h-full w-full flex flex-col">
      {/* Fixed top section: date + time */}
      <div className="h-[22%] flex items-center justify-center px-6">
        <DateTimePanel />
      </div>

      {/* Bottom section: takes the remaining height and rotates content */}
      <div className="flex-1">
        {activeSlide === "countdown" && (
          <NextPrayerPanel prayerTimes={prayerTimes} /> // existing countdown panel
        )}

        {activeSlide === "event" && <EventSlide />}      {/* placeholder event slide */}

        {activeSlide === "hadith" && <HadithSlide />}    {/* placeholder hadith slide */}
      </div>
    </div>
  );
}

// --- EVENT SLIDE (placeholder) ---
// For now this uses hard-coded data; later we can replace it with Supabase data.
function EventSlide() {
  // Dummy event data so you can see the layout immediately
  const upcomingEvent = {
    title: "Weekly Halaqah",
    description:
      "Join us for a short reminder after Maghrib every Friday in the prayer hall.",
    // For now this could be in /src/assets/events/halaqah.png
    imageUrl: "/events/halaqah.png",
  };

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="max-w-3xl w-full text-center px-8">
        {/* Event image (optional; you can tweak sizing as needed) */}
        <div className="flex justify-center mb-6">
          <img
            src={upcomingEvent.imageUrl}
            alt={upcomingEvent.title}
            className="max-h-64 object-contain drop-shadow-xl"
          />
        </div>

        {/* Event title */}
        <h2 className="text-4xl md:text-6xl font-bold text-(--next) mb-4">
          {upcomingEvent.title}
        </h2>

        {/* Event description */}
        <p className="text-xl md:text-2xl text-sky-50 leading-relaxed">
          {upcomingEvent.description}
        </p>
      </div>
    </div>
  );
}

// --- HADITH SLIDE (placeholder) ---
// Again, we'll later replace this with data from Supabase or a curated local list.
function HadithSlide() {
  const hadith = {
    reference: "Bukhari & Muslim",
    textEn:
      "The most beloved deeds to Allah are those that are most consistent, even if they are small.",
    // If you want Arabic as well, you can add textAr here and style it larger.
  };

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="max-w-4xl w-full text-center px-8">
        {/* Hadith text (you can later add Arabic on top in bigger font) */}
        <p className="text-2xl md:text-3xl text-sky-50 leading-relaxed mb-6">
          {hadith.textEn}
        </p>

        {/* Reference line */}
        <div className="text-lg md:text-xl text-sky-200">
          — {hadith.reference}
        </div>
      </div>
    </div>
  );
}
