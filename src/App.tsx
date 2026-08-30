// src/App.tsx
// Main layout:
// - Left 45%  : Prayer table (always visible)
// - Right 55% : Date/time + rotating right panel (normal mode)
//               or Adhan/Iqamah overlay during phase windows.

import DateTimePanel from "./components/DateTimePanel"; 
import PrayerTable from "./components/PrayerTable";
import RotatingSlides from "./components/RotatingSlides";

import usePrayerTimes from "./hooks/usePrayerTimes"; 
import usePrayerPhase from "./hooks/usePrayerPhase";
import useDisplayConfig from "./hooks/useDisplayConfig";
import { applyTheme } from "./theme";
import { useEffect } from "react";

// Arabic calligraphy images
import fajrImg from "./assets/fajr.png";
import dhuhrImg from "./assets/dhuhr.png";
import asrImg from "./assets/asr.png";
import maghrebImg from "./assets/maghreb.png";
import ishaImg from "./assets/isha.png";

function App() {

  const { config: displayConfig } = useDisplayConfig();

  useEffect(() => {
    applyTheme(displayConfig.themeName);
  }, [displayConfig.themeName]);

  // UPDATED: usePrayerTimes now returns { data, loading, error }
  const { data, loading, error } = usePrayerTimes();   // ← change #1

  // Pass prayer data (can be null)
  const { phase, activePrayer } = usePrayerPhase(data); // ← change #2


  // ----------------------------------------------------------
  // ADHAN / IQAMAH OVERLAY (RIGHT SIDE ONLY)
  // ----------------------------------------------------------
  if (phase !== "normal" && activePrayer && data) {

    const isAdhan = phase === "adhan";
    const mainTitle = isAdhan ? "Time for Adhan" : "Time for Prayer";
    const subTitle = `${activePrayer} ${isAdhan ? "Adhan" : "Iqamah"} now`;

    const now = new Date();
    const currentTime = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    // Determine Arabic calligraphy image
    let arabicImg: string | null = null;
    if (phase === "iqama") {
      switch (activePrayer) {
        case "Fajr": arabicImg = fajrImg; break;
        case "Dhuhr": arabicImg = dhuhrImg; break;
        case "Asr": arabicImg = asrImg; break;
        case "Maghrib": arabicImg = maghrebImg; break;
        case "Isha": arabicImg = ishaImg; break;
        default: arabicImg = null;
      }
    }

    return (
      <div className="h-screen w-screen bg-(image:--iqamatime-bg) text-white grid grid-cols-[45%_55%] overflow-hidden">

        {/* LEFT: normal prayer table stays visible */}
        <div className="h-full bg-(--table-bg)">
          <PrayerTable prayerTimes={data} />
        </div>

        {/* RIGHT: Adhan / Iqamah screen */}
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
              className="mx-auto my-10 w-[25rem] h-[20rem] object-contain"
            />
          )}

          <p className="text-xl md:text-6xl text-slate-400 mt-6">
            Please maintain silence and prepare for the prayer.
          </p>
        </div>

      </div>
    );
  }

  // ----------------------------------------------------------
  // NORMAL MODE LAYOUT
  // ----------------------------------------------------------
  return (
    <div className="h-screen w-screen bg-(image:--panel-bg) text-sky-50 overflow-hidden">
      <div className="h-full grid grid-cols-[45%_55%]">

        {/* LEFT COLUMN — Prayer Table */}
        <div className="border-r bg-(--table-bg) border-slate-800">

          {loading && (
            <div className="h-full flex items-center justify-center text-sky-300 text-lg">
              Loading prayer times…
            </div>
          )}

          {!loading && error && (
            <div className="h-full flex flex-col items-center justify-center text-red-400 text-lg">
              Failed to load prayer times.
              <span className="mt-2 text-sm opacity-80">{error.message}</span>
            </div>
          )}

          {!loading && !error && data && (
            <PrayerTable prayerTimes={data} />
          )}
        </div>

        {/* RIGHT COLUMN — Clock + Rotating Slides */}
        <div className="flex flex-col h-full">

          {/* Clock row */}
          <div className="px-8 mt-8 shrink-0">
            <DateTimePanel
              logoUrl={displayConfig.logoUrl}
              showLogo={displayConfig.showLogo}
            />
          </div>

          {/* Slide region */}
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

            {!loading && !error && data && (
              <RotatingSlides
                prayerTimes={data}
                displayConfig={displayConfig}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
