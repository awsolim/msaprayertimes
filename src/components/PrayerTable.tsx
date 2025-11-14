// PrayerTable.tsx
// Left-hand panel showing a simple table: Prayer | Adhan | Iqama.

import type { PrayerTimes } from "../hooks/usePrayerTimes";

type PrayerTableProps = {
  prayerTimes: PrayerTimes; // today's prayer times from the API
};

export default function PrayerTable({ prayerTimes }: PrayerTableProps) {
  // For now, we only have Adhan times from the API; Iqama is a placeholder.
  const rows = [
    { label: "Fajr", adhan: prayerTimes.Fajr, iqama: "--" },
    { label: "Sunrise", adhan: prayerTimes.Sunrise, iqama: "--" },
    { label: "Dhuhr", adhan: prayerTimes.Dhuhr, iqama: "--" },
    { label: "Asr", adhan: prayerTimes.Asr, iqama: "--" },
    { label: "Maghrib", adhan: prayerTimes.Maghrib, iqama: "--" },
    { label: "Isha", adhan: prayerTimes.Isha, iqama: "--" },
  ];

  return (
    <div className="h-full flex flex-col bg-sky-900/40">
      {/* Optional top line: show the day from the API */}
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
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[2fr,1fr,1fr] px-6 py-3 border-b border-slate-800 text-sky-50"
          >
            {/* Prayer name */}
            <div className="text-lg font-medium">{row.label}</div>

            {/* Adhan time */}
            <div className="text-lg text-right">{row.adhan}</div>

            {/* Iqama time (placeholder for now) */}
            <div className="text-lg text-right opacity-70">
              {row.iqama}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
