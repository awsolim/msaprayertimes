import type { VercelRequest, VercelResponse } from "@vercel/node";

// Define your Supabase credentials here or use process.env if set in Vercel
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://czbzdvpzcfnxbezxcumm.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers (Allows your Pi to talk to this endpoint)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 1. Fetch Events from Supabase via REST API (Server-to-Server)
    // We select * and filter for active events, ordering by start_at
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/events?select=*&order=start_at.asc`,
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

    // 2. Also fetch Jumuah settings (optional, logic mirrored from your frontend)
    const jumuahResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/jumuah_settings?select=*&is_active=eq.true&limit=1`, 
      {
         headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    let jumuahData = null;
    if (jumuahResponse.ok) {
        const jRows = await jumuahResponse.json();
        if (jRows.length > 0) jumuahData = jRows[0];
    }

    // Return combined data (Frontend will handle the merging logic)
    // Or just return the raw events and let frontend do the rest
    res.status(200).json({ events: data, jumuah: jumuahData });

  } catch (error: any) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: error.message });
  }
}