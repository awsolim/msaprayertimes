// src/components/PrayerTable.tsx

import type { PrayerTimes, PrayerName } from "../hooks/usePrayerTimes";
import useNow from "../hooks/useNow"; // uses debugTime when present

type Props = { prayerTimes: PrayerTimes };

export default function PrayerTable({ prayerTimes }: Props) {
  const prayers = prayerTimes.prayers;

  const order: PrayerName[] = [
    "Fajr",
    "Sunrise",
    "Dhuhr",
    "Asr",
    "Maghrib",
    "Isha",
  ];

  // Helper to strip AM/PM so times are just numbers
  const stripAmPm = (s: string) => s.replace(/ ?AM| ?PM/i, "");

  // Use shared clock (respects ?debugTime=HH:MM)
  const now = useNow();

  // Parse Adhan time for *today*
  const parseForToday = (label: PrayerName) => {
    const raw = prayers[label].adhan;
    const [time, meridiem] = raw.split(" ");
    const [hStr, mStr] = time.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (meridiem === "PM" && h !== 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      h,
      m,
      0
    );
  };

  // NEW: parse Iqama time for *today* (if present)
  const parseIqamahForToday = (label: PrayerName) => {
    const raw = prayers[label].iqama;
    if (!raw) return null; // e.g. Sunrise has no iqama

    const [time, meridiem] = raw.split(" ");
    const [hStr, mStr] = time.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (meridiem === "PM" && h !== 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      h,
      m,
      0
    );
  };

  // UPDATED: stay on a prayer until its *Iqamah* passes (if it has one),
  // otherwise use its Adhan time (e.g. Sunrise).
  const nextPrayer =
    order.find((name) => {
      const adhanTime = parseForToday(name);
      const iqamahTime = parseIqamahForToday(name);

      if (iqamahTime) {
        // If iqamah exists, consider this prayer "future" until iqamah passes
        return iqamahTime > now;
      }

      // If there is no iqamah (Sunrise), fall back to adhan
      return adhanTime > now;
    }) ?? "Fajr";

  return (
    <div className="h-full flex flex-col bg-(--tbg) border-r border-(--border)">
      {/* Header row – bigger and aligned with the numbers */}
      <div className="grid grid-cols-[2fr_1fr_1fr] gap-10 px-6 py-2 border-b border-(--border) text-(--tabletext)">
        <div /> {/* empty cell where "Prayer" used to be */}
        <div className="text-2xl md:text-3xl font-bold text-right">
          Adhan
        </div>
        <div className="text-2xl md:text-3xl font-bold text-right">
          Iqama
        </div>
      </div>

      {/* Body rows filling the container */}
      <div className="flex-1 flex flex-col">
        {order.map((name) => {
          const info = prayers[name];
          const isNext = name === nextPrayer;

          return (
            <div
              key={name}
              className={
                "flex-1 grid grid-cols-[2fr_1fr_1fr] gap-10 px-6 border-b border-slate-800 items-center " +
                (isNext
                  ? "bg-(--active-row-bg) text-sky-100 border-l-4 border-sky-300"
                  : "text-sky-50")
              }
            >
              {/* Prayer name – large label on the left */}
              <div className="text-2xl md:text-3xl font-bold text-(--tabletext)">
                {name}
              </div>

              {/* Adhan time – large numeric display */}
              <div className="text-4xl md:text-6xl font-mono text-right tracking-wide text-(--timenums)">
                {stripAmPm(info.adhan)}
              </div>

              {/* Iqama time – large numeric display */}
              <div className="text-4xl md:text-5xl font-mono text-right tracking-wide opacity-90 text-(--timenums)">
                {info.iqama ? stripAmPm(info.iqama) : "--"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
