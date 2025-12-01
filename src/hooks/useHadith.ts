import { useEffect, useState } from "react";

// Shape of a row in the "hadiths" table
export type HadithRow = {
  id: string;
  arabic_text: string;
  english_text: string;
  narrator: string;
  source: string;
  is_active: boolean;
  created_at: string;
};

type UseHadithResult = {
  hadith: HadithRow | null;
  loading: boolean;
  error: string | null;
};

export default function useHadith(): UseHadithResult {
  const [hadith, setHadith] = useState<HadithRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchHadiths() {
      try {
        setLoading(true);

        // CHANGE: Fetch from our Vercel API Proxy instead of Supabase directly
        const response = await fetch("/api/hadith");

        if (!response.ok) {
           throw new Error("Failed to fetch hadiths from proxy");
        }

        // The API returns an array of hadith rows
        const data = (await response.json()) as HadithRow[];

        if (!data || data.length === 0) {
          if (!isCancelled) {
            setHadith(null);
            setError(null);
          }
          return;
        }

        // "Hadith of the Day" Logic (keeps rotating daily)
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 0);
        const diffMs = today.getTime() - startOfYear.getTime();
        const dayOfYear = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const index = dayOfYear % data.length;
        const chosen = data[index];

        if (!isCancelled) {
          setHadith(chosen);
          setError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || "Unknown error loading hadith");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchHadiths();

    return () => {
      isCancelled = true;
    };
  }, []);

  return { hadith, loading, error };
}