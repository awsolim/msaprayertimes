import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://czbzdvpzcfnxbezxcumm.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YnpkdnB6Y2ZueGJlenhjdW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTM2NzcsImV4cCI6MjA3OTU2OTY3N30.N3gh2es8YpMUgR1vZpdrauhf-MqpEjsOj1_qTOH4_gM";

const supabaseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const [settingsResponse, modulesResponse] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/display_settings?select=*&id=eq.1&limit=1`, {
        headers: supabaseHeaders,
      }),
      fetch(`${SUPABASE_URL}/rest/v1/display_modules?select=*&order=display_order.asc`, {
        headers: supabaseHeaders,
      }),
    ]);

    if (!settingsResponse.ok || !modulesResponse.ok) {
      throw new Error(
        `Supabase configuration error: settings ${settingsResponse.status}, modules ${modulesResponse.status}`,
      );
    }

    const settingsRows = await settingsResponse.json();
    const modules = await modulesResponse.json();
    res.status(200).json({ settings: settingsRows[0] ?? null, modules });
  } catch (error) {
    console.error("Display configuration proxy error:", error);
    res.status(500).json({ error: "Unable to load display configuration" });
  }
}
