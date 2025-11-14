// src/components/NextPrayerPanel.tsx

import type { PrayerTimes, PrayerName } from "../hooks/usePrayerTimes";
import useNow from "../hooks/useNow";

type NextPrayerPanelProps = {
  prayerTimes: PrayerTimes;
};

type PrayerInfo = {
  name: PrayerName;
  timeStr: string;
  date: Date;
};

export default function NextPrayerPanel({ prayerTimes }: NextPrayerPanelProps) {
  const now = useNow(1000); // update every second
  const all = prayerTimes.prayers;

  // --- Helper to convert adhan time string to a Date object for today ---
  const parseTimeForToday = (label: PrayerName): PrayerInfo => {
    const timeStr = all[label].adhan;
    const today = new Date();

    const [timePart, meridiem] = timeStr.split(" ");
    const [hourStr, minuteStr] = timePart.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

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

    return { name: label, timeStr, date };
  };

  // List prayers in order
  const prayers: PrayerInfo[] = [
    parseTimeForToday("Fajr"),
    parseTimeForToday("Sunrise"),
    parseTimeForToday("Dhuhr"),
    parseTimeForToday("Asr"),
    parseTimeForToday("Maghrib"),
    parseTimeForToday("Isha"),
  ];

  // Find the next prayer
  let next = prayers.find((p) => p.date > now);

  if (!next) {
    // All today's prayers passed → next is tomorrow Fajr
    next = parseTimeForToday("Fajr");
    next.date.setDate(next.date.getDate() + 1);
  }

  // Compute countdown
  const diffMs = next.date.getTime() - now.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  // --- RETURN JSX (this is what fixes the React error) ---
  return (
    <div className="h-full flex flex-col items-center justify-center text-sky-100">
      <h2 className="text-3xl font-semibold mb-2">MSA UofA</h2>
      <h3 className="text-xl tracking-wide mb-4">NEXT PRAYER</h3>

      <div className="text-5xl font-bold text-sky-300 mb-6">
        {next.name}
      </div>

      <div className="flex items-center gap-8 text-center font-mono">
        <div>
          <div className="text-4xl font-bold">{hours.toString().padStart(2, "0")}</div>
          <div className="text-xs tracking-wide">HOURS</div>
        </div>

        <div>
          <div className="text-4xl font-bold">{minutes.toString().padStart(2, "0")}</div>
          <div className="text-xs tracking-wide">MINUTES</div>
        </div>

        <div>
          <div className="text-4xl font-bold">{seconds.toString().padStart(2, "0")}</div>
          <div className="text-xs tracking-wide">SECONDS</div>
        </div>
      </div>

      <p className="mt-6 text-sm opacity-60">
        Upcoming events and adhkar will appear here inshaAllah.
      </p>
    </div>
  );
}
