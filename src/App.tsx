// src/App.tsx
// Main layout:
// - Left 40%  : Prayer table (always visible)
// - Right 60% : Date/time + next-prayer panel (normal mode)
//               or Adhan/Iqamah overlay during phase windows.

import DateTimePanel from "./components/DateTimePanel";
import PrayerTable from "./components/PrayerTable";
import NextPrayerPanel from "./components/NextPrayerPanel";

import usePrayerTimes from "./hooks/usePrayerTimes";
import usePrayerPhase from "./hooks/usePrayerPhase";

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
  //
  // If we are in an adhan or iqamah window AND we have a valid active prayer,
  // we override the right panel with a black screen, but keep the left table.
  if (phase !== "normal" && activePrayer && prayerTimes) {
    const isAdhan = phase === "adhan";

    // Main titles for the overlay
    const mainTitle = isAdhan ? "Time for Adhan" : "Time for Prayer";
    const subTitle = `${activePrayer} ${isAdhan ? "Adhan" : "Iqamah"} now`;

    // Format the current time as "4:45 PM"
    const now = new Date();
    const currentTime = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    // Pick the Arabic calligraphy image for the current prayer (iqamah only)
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
      <div className="h-screen w-screen bg-black text-white grid grid-cols-[40%_60%] overflow-hidden">
        {/* LEFT SIDE: keep the normal prayer table visible */}
        <div className="h-full bg-(--table-bg)">
          <PrayerTable prayerTimes={prayerTimes} />
        </div>

        {/* RIGHT SIDE: black Adhan / Iqamah screen */}
        <div className="flex flex-col items-center justify-center text-center px-6">
          {/* Current time – large white text at the top */}
          <div className="text-5xl md:text-7xl font-bold mb-6">
            {currentTime}
          </div>

          {/* Main heading: "Time for Adhan" or "Time for Prayer" */}
          <h1 className="text-6xl md:text-7xl font-extrabold mb-4">
            {mainTitle}
          </h1>

          {/* Subheading: "<Prayer> Adhan/Iqamah now" */}
          <p className="text-3xl md:text-4xl text-slate-200 mb-8">
            {subTitle}
          </p>

          {/* Huge Arabic calligraphy image (iqamah only) */}
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

          {/* Instruction text at the bottom */}
          <p className="text-xl md:text-2xl text-slate-400 mt-6">
            Please maintain silence and prepare for the prayer.
          </p>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────
  // Normal layout
  // ───────────────────────────────────────────────
  return (
    <div className="h-screen w-screen bg-(--panel-bg) text-sky-50 overflow-hidden">
      {/* 2-column layout: left = table, right = time + next-prayer */}
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

        {/* RIGHT COLUMN: Date/time at top, next-prayer countdown below */}
        <div className="flex flex-col h-full">
          {/* Date + time panel near the top */}
          <div className="px-8 mt-8">
            <DateTimePanel />
          </div>

          {/* Next prayer countdown fills remaining vertical space */}
          <div className="flex-1 mb-16">
            {loading && (
              <div className="h-full flex items-center justify-center text-sky-300 text-lg">
                Loading…
              </div>
            )}

            {!loading && error && (
              <div className="h-full flex items-center justify-center text-red-400 text-lg">
                Unable to show countdown.
              </div>
            )}

            {!loading && !error && prayerTimes && (
              <NextPrayerPanel prayerTimes={prayerTimes} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
