import type { VercelRequest, VercelResponse } from "@vercel/node";

// Use environment variables or fallback to your URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://czbzdvpzcfnxbezxcumm.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YnpkdnB6Y2ZueGJlenhjdW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTM2NzcsImV4cCI6MjA3OTU2OTY3N30.N3gh2es8YpMUgR1vZpdrauhf-MqpEjsOj1_qTOH4_gM";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow the Pi to access this endpoint
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Fetch ALL active hadiths from Supabase via REST
    // We fetch all of them so the frontend can still do the "Hadith of the Day" logic
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/hadiths?select=*&is_active=eq.true`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (error: any) {
    console.error("Hadith proxy error:", error);
    res.status(500).json({ error: error.message });
  }
}