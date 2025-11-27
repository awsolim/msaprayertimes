// src/App.tsx
// Main layout:
// - Left 40%  : Prayer table (always visible)
// - Right 60% : Date/time + rotating right panel (normal mode)
//               or Adhan/Iqamah overlay during phase windows.

import DateTimePanel from "./components/DateTimePanel"; // top-right clock + date
import PrayerTable from "./components/PrayerTable"; // left-side table
import RotatingSlides from "./components/RotatingSlides"; // rotating slides for countdown/event/hadith

import usePrayerTimes from "./hooks/usePrayerTimes"; // fetches prayer times
import usePrayerPhase from "./hooks/usePrayerPhase"; // determines normal/adhan/iqamah phase

// Arabic calligraphy images for iqamah screen
import fajrImg from "./assets/fajr.png";
import dhuhrImg from "./assets/dhuhr.png";
import asrImg from "./assets/asr.png";
import maghrebImg from "./assets/maghreb.png";
import ishaImg from "./assets/isha.png";

function App() {
  // Fetch + normalize prayer times from the Netlify function
  const { prayerTimes, loading, error } = usePrayerTimes();

  // Determine whether we are in "normal", "adhan", or "iqamah" phase,
  // and which prayer is currently active for that phase.
  const { phase, activePrayer } = usePrayerPhase(prayerTimes);

  // ───────────────────────────────────────────────
  // Adhan / Iqamah overlay (RIGHT SIDE ONLY)
  // ───────────────────────────────────────────────
  if (phase !== "normal" && activePrayer && prayerTimes) {
    const isAdhan = phase === "adhan";

    const mainTitle = isAdhan ? "Time for Adhan" : "Time for Prayer";
    const subTitle = `${activePrayer} ${isAdhan ? "Adhan" : "Iqamah"} now`;

    const now = new Date();
    const currentTime = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    let arabicImg: string | null = null;
    if (phase === "iqama") {
      switch (activePrayer) {
        case "Fajr":
          arabicImg = fajrImg;
          break;
        case "Dhuhr":
          arabicImg = dhuhrImg;
          break;
        case "Asr":
          arabicImg = asrImg;
          break;
        case "Maghrib":
          arabicImg = maghrebImg;
          break;
        case "Isha":
          arabicImg = ishaImg;
          break;
        default:
          arabicImg = null;
      }
    }

    return (
      <div className="h-screen w-screen bg-(image:--iqamatime-bg) text-white grid grid-cols-[40%_60%] overflow-hidden">
        {/* LEFT SIDE: keep the normal prayer table visible */}
        <div className="h-full bg-(--table-bg)">
          <PrayerTable prayerTimes={prayerTimes} />
        </div>

        {/* RIGHT SIDE: Adhan / Iqamah screen */}
        <div className="flex flex-col items-center justify-center text-center px-6">
          <div className="text-5xl md:text-7xl font-bold mb-6">
            {currentTime}
          </div>

          <h1 className="text-6xl md:text-7xl font-extrabold mb-4">
            {mainTitle}
          </h1>

          <p className="text-3xl md:text-4xl text-slate-200 mb-8">
            {subTitle}
          </p>

          {phase === "iqama" && arabicImg && (
            <img
              src={arabicImg}
              alt={activePrayer}
              className="
                mx-auto
                my-10
                w-[25rem] h-[20rem]
                object-contain
              "
            />
          )}

          <p className="text-xl md:text-2xl text-slate-400 mt-6">
            Please maintain silence and prepare for the prayer.
          </p>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────
  // Normal layout (no adhan/iqamah overlay)
  // ───────────────────────────────────────────────
  return (
    <div className="h-screen w-screen bg-(image:--panel-bg) text-sky-50 overflow-hidden">
      <div className="h-full grid grid-cols-[40%_60%]">
        {/* LEFT COLUMN: Prayer table (with loading/error states) */}
        <div className="border-r bg-(--table-bg) border-slate-800">
          {loading && (
            <div className="h-full flex items-center justify-center text-sky-300 text-lg">
              Loading prayer times…
            </div>
          )}

          {!loading && error && (
            <div className="h-full flex flex-col items-center justify-center text-red-400 text-lg">
              Failed to load prayer times.
              <span className="mt-2 text-sm opacity-80">{error}</span>
            </div>
          )}

          {!loading && !error && prayerTimes && (
            <PrayerTable prayerTimes={prayerTimes} />
          )}
        </div>

        {/* RIGHT COLUMN: Date/time at top, rotating content below */}
        {/* RIGHT COLUMN: Date/time at top, rotating content below */}
<div className="flex flex-col h-full">
  {/* Clock row: fixed height, doesn't shrink */}
  <div className="px-8 mt-8 shrink-0">
    <DateTimePanel />
  </div>

  {/* Main right panel: fills remaining height, content scrolls inside it */}
  <div className="flex-1 overflow-hidden">
    {loading && (
      <div className="h-full flex items-center justify-center text-sky-300 text-lg">
        Loading…
      </div>
    )}

    {!loading && error && (
      <div className="h-full flex items-center justify-center text-red-400 text-lg">
        Unable to show right panel.
      </div>
    )}

    {!loading && !error && prayerTimes && (
      <RotatingSlides prayerTimes={prayerTimes} />
    )}
  </div>
</div>

      </div>
    </div>
  );
}

export default App;
