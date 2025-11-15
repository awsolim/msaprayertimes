// src/App.tsx
// Layout: left 40% = PrayerTable, right 60% = DateTime (top), MSA logo (middle), NextPrayerPanel (bottom).

import DateTimePanel from "./components/DateTimePanel";
import PrayerTable from "./components/PrayerTable";
import NextPrayerPanel from "./components/NextPrayerPanel";
import usePrayerPhase from "./hooks/usePrayerPhase"; // NEW: adhan/iqama phase logic
import muezzinImg from "./assets/muezzin.png"; // NEW: adhan icon
import prayersImg from "./assets/prayers.png"; // NEW: iqamah icon

import usePrayerTimes from "./hooks/usePrayerTimes";
 // MSA logo image

function App() {
  const { prayerTimes, loading, error } = usePrayerTimes(); // hook that fetches + normalizes prayer data
  // NEW: determine if we are in normal mode, adhan screen, or iqama screen
  const { phase, activePrayer } = usePrayerPhase(prayerTimes);

    // 🔔 Fullscreen Adhan / Iqamah screen override
  // If we are inside the adhan/iqamah window for some prayer,
  // we temporarily show a very simple full-screen message instead
  // of the normal layout.
  // 🔔 Fullscreen Adhan / Iqamah screen override
if (phase !== "normal" && activePrayer) {
  const isAdhan = phase === "adhan";

  const iconSrc = isAdhan ? muezzinImg : prayersImg;
  const mainTitle = isAdhan ? "Time for Adhan" : "Time for Prayer";
  const subTitle = `${activePrayer} ${isAdhan ? "Adhan" : "Iqamah"} now`;

  return (
    <div className="min-h-screen w-full bg-black text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-7xl px-10 py-10 flex flex-col md:flex-row items-center justify-center gap-16">

        {/* ICON LEFT */}
        <div className="flex-1 flex items-center justify-center">
          <img
            src={iconSrc}
            alt=""
            className="w-64 h-64 md:w-96 md:h-96 object-contain drop-shadow-[0_0_35px_rgba(255,255,255,0.18)]"
          />
        </div>

        {/* TEXT RIGHT — centered + larger */}
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
          <h1 className="text-6xl md:text-8xl font-extrabold leading-tight">
            {mainTitle}
          </h1>
          <p className="text-3xl md:text-4xl font-medium text-slate-200">
            {subTitle}
          </p>
          <p className="text-xl md:text-2xl text-slate-400 max-w-lg">
            Please maintain silence and prepare for the prayer.
          </p>
        </div>

      </div>
    </div>
  );
}



  return (
    <div className="h-screen w-screen bg-(--panel-bg) text-sky-50 overflow-hidden">
      {/* Two main columns: left (40%) and right (60%) */}
      <div className="h-full grid grid-cols-[40%_60%]">
        {/* LEFT COLUMN: Prayer table only */}
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
            <PrayerTable prayerTimes={prayerTimes} /> // full-height table on the left
          )}
        </div>

        {/* RIGHT COLUMN: DateTime (top), MSA logo (middle), NextPrayerPanel (bottom) */}
        <div className="flex flex-col h-full">
          {/* Date/time – moved DOWN using mt-8, centered by the component itself */}
          <div className="px-8 mt-8">
            <DateTimePanel />
          </div>



          {/* Next prayer countdown fills the remaining space */}
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
