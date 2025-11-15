// src/components/HeaderBar.tsx

import useNow from "../hooks/useNow";
import msalogo from "../assets/msalogo.png";

export default function HeaderBar() {
  const now = useNow(1000); // keep updating every second, even though we hide seconds

  // Format time WITHOUT seconds so it can be larger
  const timeStr = now.toLocaleTimeString("en-CA", {
    hour12: true,
    hour: "numeric",
    minute: "2-digit",
  });

  const gregorian = now.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let hijri = "";
  try {
    hijri = new Intl.DateTimeFormat("en-GB-u-ca-islamic", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(now);
  } catch {
    // If Hijri is not supported, we just leave it blank
  }

  return (
    <header className="w-full bg-slate-950 border-b border-slate-800">
      <div
        className="
          w-full
          grid grid-cols-[1fr_1fr_1fr]
          items-center
          px-6
          py-3            /* a bit thicker header */
          h-[96px]        /* fixed height so it feels solid on big screens */
        "
      >
        {/* LEFT – current time, made much larger */}
        <div className="text-sky-100">
          <div className="text-4xl md:text-5xl font-semibold">
            {timeStr}
          </div>
        </div>

        {/* CENTER – logo */}
        <div className="flex justify-center">
          <img
            src={msalogo}
            alt="MSA logo"
            className="h-12 md:h-14 object-contain" // slightly taller logo to match thicker header
          />
        </div>

        {/* RIGHT – Gregorian + Hijri dates */}
        <div className="text-right text-sky-200">
          <div className="text-base md:text-lg font-medium">
            {gregorian}
          </div>
          {hijri && (
            <div className="text-sm md:text-base text-sky-300/80">
              {hijri}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
