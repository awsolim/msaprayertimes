// App.tsx
// Top-level structure: header, 40/60 main area, footer.

import HeaderBar from "./components/HeaderBar";          // top bar with title + clock
import SlideFooter from "./components/SlideFooter";      // bottom bar for events/adhkar
import PrayerTable from "./components/PrayerTable";      // left 40% table
import NextPrayerPanel from "./components/NextPrayerPanel"; // right 60% countdown panel
import usePrayerTimes from "./hooks/usePrayerTimes";     // hook that fetches prayer times

function App() {
  // Use the hook to fetch today's prayer times (and refresh daily)
  const { prayerTimes, loading, error } = usePrayerTimes();

  return (
    <div className="flex flex-col h-screen w-screen text-white bg-slate-950">
      {/* Header: title + live clock */}
      <HeaderBar />

      {/* Main area: loading/error/success states */}
      <main className="flex-1 flex overflow-hidden">
        {/* Loading state */}
        {loading && (
          <div className="flex-1 flex items-center justify-center text-xl">
            Loading prayer times...
          </div>
        )}

        {/* Error state */}
        {!loading && (error || !prayerTimes) && (
          <div className="flex-1 flex flex-col items-center justify-center text-xl text-red-400">
            <p className="mb-2">Failed to load prayer times.</p>
            {error && <p className="text-sm opacity-80">{error}</p>}
          </div>
        )}

        {/* Success state: show 40/60 layout when we have prayerTimes */}
        {!loading && prayerTimes && (
          <div className="flex flex-1">
            {/* LEFT: 40% (Prayer / Adhan / Iqama table) */}
            <section className="w-2/5 border-r border-slate-800">
              <PrayerTable prayerTimes={prayerTimes} />
            </section>

            {/* RIGHT: 60% (countdown + future rotating content) */}
            <section className="w-3/5">
              <NextPrayerPanel prayerTimes={prayerTimes} />
            </section>
          </div>
        )}
      </main>

      {/* Footer: reserved for scrolling events/adhkar later */}
      <SlideFooter />
    </div>
  );
}

export default App;
