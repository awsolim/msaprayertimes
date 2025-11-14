// PrayerTable.tsx
// Left-hand panel showing a simple table: Prayer | Adhan | Iqama.

import type { PrayerTimes, PrayerName } from "../hooks/usePrayerTimes";

type PrayerTableProps = {
  prayerTimes: PrayerTimes; // today's combined prayer times from API
};

export default function PrayerTable({ prayerTimes }: PrayerTableProps) {
  const prayers = prayerTimes.prayers; // shortcut to nested prayers object

  // Order of rows to display
  const order: PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

  return (
    <div className="h-full flex flex-col bg-sky-900/40">
      {/* Day label at top (e.g. FRIDAY) */}
      <div className="px-6 pt-4 pb-1 text-sm uppercase tracking-wide text-sky-200/80">
        {prayerTimes.Day}
      </div>

      {/* Table header row */}
      <div className="grid grid-cols-[2fr,1fr,1fr] px-6 py-3 border-b border-slate-700 text-sky-50">
        <div className="text-lg font-semibold">Prayer</div>
        <div className="text-lg font-semibold text-right">Adhan</div>
        <div className="text-lg font-semibold text-right">Iqama</div>
      </div>

      {/* Table body rows */}
      <div className="flex-1 overflow-hidden">
        {order.map((name) => {
          const info = prayers[name]; // adhan + iqama for this prayer

          return (
            <div
              key={name}
              className="grid grid-cols-[2fr,1fr,1fr] px-6 py-3 border-b border-slate-800 text-sky-50"
            >
              {/* Prayer name */}
              <div className="text-lg font-medium">{name}</div>

              {/* Adhan time */}
              <div className="text-lg text-right">{info.adhan}</div>

              {/* Iqama time (if null, show "--") */}
              <div className="text-lg text-right opacity-70">
                {info.iqama ?? "--"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
