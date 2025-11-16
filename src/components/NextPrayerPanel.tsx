// src/components/NextPrayerPanel.tsx
// Right-side panel showing either:
//   "<PRAYER> Adhan in"  or  "<PRAYER> Iqamah in"
// with a large countdown timer.
//
// New logic:
//   - For each prayer, we treat Adhan and Iqamah as separate "stages".
//   - Timeline per prayer: [Adhan] -> [Iqamah (if exists)].
//   - Before Adhan: we count down to Adhan.
//   - After Adhan but before Iqamah: we count down to Iqamah.
//   - After Iqamah: we move on to the next prayer's Adhan.
//   - If a prayer has no Iqamah (null), we only use its Adhan.

import type { PrayerTimes, PrayerName } from "../hooks/usePrayerTimes";
import useNow from "../hooks/useNow";

type Props = { prayerTimes: PrayerTimes };

// Each countdown target is a "stage" for a specific prayer
type StageTarget = {
  prayerName: PrayerName;        // which prayer (Fajr, Dhuhr, etc.)
  stage: "adhan" | "iqamah";     // which stage we are counting to
  target: Date;                  // exact Date/time of that stage today
};

export default function NextPrayerPanel({ prayerTimes }: Props) {
  const now = useNow(1000); // live-updating Date (ticks every second)
  const all = prayerTimes.prayers;

  // --- Helper: parse a "h:mm AM/PM" string into a Date for *today* ---
  const parseTimeToday = (timeStr: string): Date => {
    // timeStr will look like "4:43 PM" or "5:55 AM"
    const [timePart, meridiem] = timeStr.split(" ");
    const [hStr, mStr] = timePart.split(":");

    let h = parseInt(hStr, 10);       // hour part
    const m = parseInt(mStr, 10);     // minute part

    // Convert 12-hour time into 24-hour for the Date constructor
    if (meridiem === "PM" && h !== 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;

    // Build a Date for today with that time
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      h,
      m,
      0,
      0
    );
  };

  // --- Step 1: Build a *timeline* of stages for the whole day ---
  const order: PrayerName[] = [
    "Fajr",
    "Sunrise",
    "Dhuhr",
    "Asr",
    "Maghrib",
    "Isha",
  ];

  const stages: StageTarget[] = [];

  for (const prayerName of order) {
    const info = all[prayerName];

    // Always add the Adhan stage
    stages.push({
      prayerName,
      stage: "adhan",
      target: parseTimeToday(info.adhan), // build Date for adhan
    });

    // If there is an Iqamah time, add a second stage *after* adhan
    if (info.iqama) {
      const iqamahDate = parseTimeToday(info.iqama); // Date for iqamah

      // Only include iqamah if it's after adhan (sanity check)
      if (iqamahDate > parseTimeToday(info.adhan)) {
        stages.push({
          prayerName,
          stage: "iqamah",
          target: iqamahDate,
        });
      }
    }
  }

  // --- Step 2: Pick the next upcoming stage (Adhan or Iqamah) ---
  let nextStage = stages.find((s) => s.target > now) ?? null;

  if (!nextStage) {
    // If we've passed all stages today (e.g., after Isha iqamah),
    // then the next thing is *tomorrow's* Fajr Adhan.
    const fajrInfo = all["Fajr"];
    const tomorrowFajrAdhan = parseTimeToday(fajrInfo.adhan);
    tomorrowFajrAdhan.setDate(tomorrowFajrAdhan.getDate() + 1);

    nextStage = {
      prayerName: "Fajr",
      stage: "adhan",
      target: tomorrowFajrAdhan,
    };
  }

  // --- Step 3: Compute the countdown (HH:MM:SS) to that stage ---
  const diffSec = Math.max(
    0,
    Math.floor((nextStage.target.getTime() - now.getTime()) / 1000)
  );

  const hh = String(Math.floor(diffSec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
  const ss = String(diffSec % 60).padStart(2, "0");

  const isAdhanStage = nextStage.stage === "adhan"; // true = Adhan, false = Iqamah

  // --- Step 4: Render the panel with appropriate label text ---
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center px-8 max-w-4xl w-full">
        {/* MAIN TITLE: e.g. "Maghrib Adhan in" or "Maghrib Iqamah in" */}
        <h2 className="text-6xl md:text-[120px] font-bold text-(--next) mb-10">
          {nextStage.prayerName}{" "}
          <span className="font-mono text-[55px] text-white ">
            {isAdhanStage ? "Adhan" : "Iqamah"} in
          </span>
        </h2>

        {/* COUNTDOWN: HH : MM : SS with labels underneath */}
        <div className="flex justify-center items-end gap-4 md:gap-6 font-mono mb-10">
          {/* HOURS */}
          <div className="min-w-[110px]">
            <div className="text-6xl md:text-[150px] font-extrabold">{hh}</div>
            <div className="text-sm md:text-[20px] tracking-[0.4em] mt-3">
              HOURS
            </div>
          </div>

          {/* Colon between hours and minutes */}
          <div className="text-5xl md:text-[150px] font-extrabold pb-4">
            :
          </div>

          {/* MINUTES */}
          <div className="min-w-[110px]">
            <div className="text-6xl md:text-[150px] font-extrabold">{mm}</div>
            <div className="text-sm md:text-[20px] tracking-[0.4em] mt-3">
              MINUTES
            </div>
          </div>

          {/* Colon between minutes and seconds */}
          <div className="text-5xl md:text-[150px] font-extrabold pb-4">
            :
          </div>

          {/* SECONDS */}
          <div className="min-w-[110px]">
            <div className="text-6xl md:text-[150px] font-extrabold">{ss}</div>
            <div className="text-sm md:text-[20px] tracking-[0.4em] mt-3">
              SECONDS
            </div>
          </div>
        </div>

        
      </div>
    </div>
  );
}
