import { useEffect, useState } from "react";

// Describe the expected JSON shape from the API
export type PrayerName = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export type PrayerTimes = {
  Day: string; // day name, e.g. "Friday"
  prayers: Record<
    PrayerName,
    {
      adhan: string;        // adhan time string
      iqama: string | null; // iqamah time string or null
    }
  >;
};

// Frontend always calls this relative path.
// Vite proxies it (in dev) to https://msauofa.ca/prayer-times.
const API_PATH = "https://msaprayerdisplay.netlify.app/.netlify/functions/prayer-times";

export default function usePrayerTimes() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null); // holds API data
  const [error, setError] = useState<string | null>(null);                  // holds error message
  const [loading, setLoading] = useState<boolean>(true);                    // loading flag

  // Function that calls the API and updates state
  const fetchPrayerTimes = async () => {
    try {
      setLoading(true);    // mark as loading
      setError(null);      // reset previous error

      console.log("Fetching prayer times from:", API_PATH); // debug log

      const res = await fetch(API_PATH); // perform the HTTP GET request

      if (!res.ok) {
        // Non-2xx response is considered an error
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      // Inspect content-type so we don't try to parse HTML as JSON
      const contentType = res.headers.get("content-type") || "";
      console.log("Prayer-times content-type:", contentType); // debug log

      if (!contentType.includes("application/json")) {
        // If not JSON, read as text and show first part for debugging
        const text = await res.text();
        throw new Error(
          `Expected JSON but got content-type "${contentType}". Response starts with: ${text.slice(
            0,
            80
          )}...`
        );
      }

      // At this point we trust that response is JSON. Cast to PrayerTimes.
      const data = (await res.json()) as PrayerTimes;

      console.log("Prayer-times data:", data); // debug log

      setPrayerTimes(data); // save data to state
    } catch (err: unknown) {
      console.error("Error fetching prayer times:", err); // full console log

      if (err instanceof Error) {
        setError(err.message); // show human-readable message in UI
      } else {
        setError("Unknown error while fetching prayer times");
      }
    } finally {
      setLoading(false); // clear loading flag regardless of success/failure
    }
  };

  useEffect(() => {
    // Fetch immediately on first mount
    fetchPrayerTimes();

    // Schedule a refresh at midnight (local time)
    const now = new Date();
    const millisUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
      now.getTime();

    const midnightTimeout = setTimeout(() => {
      // Refresh once at the upcoming midnight
      fetchPrayerTimes();

      // Then refresh every 24 hours
      setInterval(fetchPrayerTimes, 24 * 60 * 60 * 1000);
    }, millisUntilMidnight);

    // Cleanup the timeout if component unmounts
    return () => clearTimeout(midnightTimeout);
  }, []);

  // Expose hook state to components
  return { prayerTimes, loading, error };
}
