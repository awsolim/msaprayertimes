// NextPrayerPanel.tsx
// Right-hand panel: shows which prayer is next and a live countdown.

import type { PrayerTimes } from "../hooks/usePrayerTimes";
import useNow from "../hooks/useNow";

type NextPrayerPanelProps = {
  prayerTimes: PrayerTimes; // today's prayer times
};

type PrayerInfo = {
  name: string;
  timeStr: string;
  date: Date;
};

export default function NextPrayerPanel({ prayerTimes }: NextPrayerPanelProps) {
  const now = useNow(1000); // re-render every second

  // Helper: parse a "h:mm AM/PM" time string into a Date for today
  const parseTimeForToday = (label: string, timeStr: string): PrayerInfo => {
    const today = new Date(); // today's date
    const [timePart, meridiem] = timeStr.split(" "); // e.g. "5:55 AM" -> ["5:55", "AM"]
    const [hourStr, minuteStr] = timePart.split(":"); // "5:55" -> ["5", "55"]

    let hour = parseInt(hourStr, 10);    // convert hour text to number
    const minute = parseInt(minuteStr, 10); // convert minute text to number

    // convert from 12-hour clock to 24-hour so Date understands it
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;

    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      hour,
      minute,
      0,
      0
    );

    return { name: label, timeStr, date }; // return info for this prayer
  };

  // Build a list of today's prayers in order
  const prayers: PrayerInfo[] = [
    parseTimeForToday("Fajr", prayerTimes.Fajr),
    parseTimeForToday("Sunrise", prayerTimes.Sunrise),
    parseTimeForToday("Dhuhr", prayerTimes.Dhuhr),
    parseTimeForToday("Asr", prayerTimes.Asr),
    parseTimeForToday("Maghrib", prayerTimes.Maghrib),
    parseTimeForToday("Isha", prayerTimes.Isha),
  ];

  // Find the first prayer whose time is still in the future
  let next = prayers.find((p) => p.date.getTime() > now.getTime());

  // If all prayers today have passed, the next one is tomorrow's Fajr
  if (!next) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1); // advance one day

    const fajrTomorrow = parseTimeForToday("Fajr", prayerTimes.Fajr);
    fajrTomorrow.date.setFullYear(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate()
    );

    next = fajrTomorrow;
  }

  // Compute difference in milliseconds
  const diffMs = next.date.getTime() - now.getTime();
  const safeDiffMs = Math.max(diffMs, 0);        // never negative

  const totalSeconds = Math.floor(safeDiffMs / 1000);       // convert to seconds
  const hours = Math.floor(totalSeconds / 3600);            // hours left
  const minutes = Math.floor((totalSeconds % 3600) / 60);   // minutes after hours
  const seconds = totalSeconds % 60;                        // remaining seconds

  // Helper to render two-digit numbers (7 -> "07")
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-900">
      {/* Slot for logo/text at top */}
      <div className="mb-6 text-3xl font-bold tracking-wide text-sky-200">
        {/* Replace this with an <img> for your MSA logo later if you like */}
        MSA UofA
      </div>

      {/* Next prayer label */}
      <div className="mb-2 text-xl uppercase tracking-[0.25em] text-sky-100">
        NEXT PRAYER
      </div>
      <div className="mb-6 text-4xl font-extrabold text-sky-300">
        {next.name}
      </div>

      {/* Countdown label */}
      <div className="mb-2 text-lg uppercase tracking-[0.2em] text-slate-300">
        TIME REMAINING
      </div>

      {/* Countdown digits */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <TimeBox label="HOURS" value={pad(hours)} />
        <TimeBox label="MINUTES" value={pad(minutes)} />
        <TimeBox label="SECONDS" value={pad(seconds)} />
      </div>

      {/* Future area for rotating events/adhkar messages */}
      <div className="mt-4 text-sm text-slate-400 max-w-md text-center">
        Upcoming events and adhkar messages will appear here inshaAllah.
      </div>
    </div>
  );
}

type TimeBoxProps = {
  label: string;
  value: string;
};

// Small subcomponent for each countdown column (hours/minutes/seconds)
function TimeBox({ label, value }: TimeBoxProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-5xl font-bold bg-slate-800 px-6 py-3 rounded-xl shadow-lg">
        {value}
      </div>
      <div className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-300">
        {label}
      </div>
    </div>
  );
}
