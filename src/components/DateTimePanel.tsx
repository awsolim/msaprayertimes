// src/components/DateTimePanel.tsx
// Shows current time (large, colored) and Gregorian date, centered.
// NOTE: vertical position is controlled by the parent container in App.tsx.

import useNow from "../hooks/useNow"; // custom hook returning a Date that updates regularly
import msalogo from "../assets/msalogo.png"; // MSA logo shown next to the time

export default function DateTimePanel() {
  const now = useNow(1000); // update every second

  // Use en-US so we get "3:28 PM" instead of "3:28 p.m."
  const rawTime = now.toLocaleTimeString("en-US", {
    hour12: true,
    hour: "numeric",
    minute: "2-digit",
  });

  // Just in case, force any lowercase am/pm to uppercase AM/PM
  const timeStr = rawTime.replace(/am/i, "AM").replace(/pm/i, "PM");

  // Gregorian date, e.g. "Friday, November 14, 2025"
  const gregorian = now.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

    return (
    // Outer container: centers everything and gives us a column layout
    <div className="flex flex-col items-center justify-center text-center text-sky-100">
      {/* DATE centered above */}
      <div className="text-xl md:text-3xl tracking-[0.2em] font-semibold mb-4">
        {gregorian}
      </div>

      {/* Row with TIME and MSA LOGO aligned vertically */}
      <div className="flex items-center gap-6">
        {/* Current time: warm green, big */}
        <div className="text-(--current-time) text-5xl md:text-6xl font-semibold">
          {timeStr}
        </div>

        {/* MSA logo to the right of the time */}
        <img
          src={msalogo}
          alt="MSA logo"
          className="h-14 md:h-16 object-contain"
        />
      </div>
    </div>
  );

}
