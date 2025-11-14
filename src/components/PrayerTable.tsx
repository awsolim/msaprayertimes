// src/components/PrayerTable.tsx
// Left column showing: Prayer | Adhan | Iqama
// Works with Netlify function structure:
// {
//   Day: "Friday",
//   prayers: {
//      Fajr:    { adhan: "5:55 AM", iqama: "6:25 AM" },
//      Sunrise: { adhan: "7:58 AM", iqama: null },
//      ...
//   }
// }

import type { PrayerTimes, PrayerName } from "../hooks/usePrayerTimes";

type PrayerTableProps = {
  prayerTimes: PrayerTimes;
};

export default function PrayerTable({ prayerTimes }: PrayerTableProps) {
  const prayers = prayerTimes.prayers;

  // Order in which to display rows
  const order: PrayerName[] = [
    "Fajr",
    "Sunrise",
    "Dhuhr",
    "Asr",
    "Maghrib",
    "Isha",
  ];

  return (
    <div className="h-full flex flex-col bg-sky-900/40 border-r border-slate-800">
      {/* Day header */}
      <div className="px-6 pt-4 pb-2 text-sm uppercase tracking-wide text-sky-200/80">
        {prayerTimes.Day}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[2fr,1fr,1fr] px-6 py-3 border-b border-slate-700 text-sky-50">
        <div className="text-lg font-semibold">Prayer</div>
        <div className="text-lg font-semibold text-right">Adhan</div>
        <div className="text-lg font-semibold text-right">Iqama</div>
      </div>

      {/* Table rows */}
      <div className="flex-1 overflow-hidden">
        {order.map((name) => {
          const info = prayers[name];

          return (
            <div
              key={name}
              className="grid grid-cols-[2fr,1fr,1fr] px-6 py-3 border-b border-slate-800 text-sky-50"
            >
              {/* Prayer name */}
              <div className="text-lg font-medium">{name}</div>

              {/* Adhan time */}
              <div className="text-lg text-right">{info.adhan}</div>

              {/* Iqama time or "--" */}
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
