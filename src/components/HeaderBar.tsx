import Clock from "./Clock"; // import our clock component

export default function HeaderBar() {
  return (
    <header className="h-[12vh] flex items-center justify-between px-10 bg-slate-900 border-b border-slate-700">
      {/* Left: title */}
      <h1 className="text-3xl font-bold tracking-wide">
        MSA Prayer Display
      </h1>

      {/* Right: live clock */}
      <Clock />
    </header>
  );
}
