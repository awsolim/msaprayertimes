// SlideFooter.tsx
// This component renders the bottom bar of the display.
// Later, it will cycle through upcoming events, adhkar, and announcements.

export default function SlideFooter() {
  return (
    <footer
      className="h-[12vh] bg-slate-900 border-t border-slate-700 flex items-center justify-center px-10"
    >
      {/* Placeholder text until we integrate Supabase + real slides */}
      <p className="text-xl opacity-80">
        Events & adhkar will appear here.
      </p>
    </footer>
  );
}
