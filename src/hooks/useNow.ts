// useNow.ts
// Simple hook that returns the current Date, updating every intervalMs ms.

import { useEffect, useState } from "react";

export default function useNow(intervalMs: number = 1000) {
  const [now, setNow] = useState<Date>(new Date()); // hold current time

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date()); // update state each tick
    }, intervalMs);

    return () => clearInterval(id); // cleanup interval on unmount
  }, [intervalMs]);

  return now; // expose current Date to the component using this hook
}
