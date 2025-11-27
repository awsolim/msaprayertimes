import { useEffect, useState } from "react";


export default function useNow(intervalMs: number = 1000) {

  const [debugNow] = useState<Date | null>(() => {
    // If window doesn't exist (e.g., during SSR), just bail out
    if (typeof window === "undefined") return null;

    const params = new URLSearchParams(window.location.search); 
    const debugTime = params.get("debugTime"); // expect something like "15:30"

    if (!debugTime) return null; 

    const [hourStr, minuteStr] = debugTime.split(":");
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      // If the format is wrong, ignore debugTime and use real clock
      console.warn("Invalid debugTime format. Expected HH:MM.");
      return null;
    }

    const now = new Date(); // 
    const frozen = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0,
      0
    );

    console.info("Using debug time override:", frozen.toString());
    return frozen; // this will freeze "now" for the whole app
  });

  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (debugNow) {
      return; // nothing to clean up
    }

    // Otherwise, start a regular ticking interval
    const id = setInterval(() => {
      setNow(new Date()); // update to real current time
    }, intervalMs);

    // Cleanup interval when component unmounts or intervalMs changes
    return () => clearInterval(id);
  }, [intervalMs, debugNow]);

  // If debugNow exists, always return it; otherwise return the live "now"
  return debugNow ?? now;
}
