// netlify/functions/prayer-times.ts
// Netlify serverless function that proxies the upstream prayer-times JSON
// and adds CORS headers so the frontend can fetch it from any origin.

import type { Handler } from "@netlify/functions";

// Upstream URL that returns the JSON you already have
const UPSTREAM_URL = "http://132.145.105.37/prayer-times";

// CORS headers we want on every response
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",                 // allow any origin (you can restrict later)
  "Access-Control-Allow-Methods": "GET, OPTIONS",     // allowed methods
  "Access-Control-Allow-Headers": "Content-Type",     // allowed headers
};

export const handler: Handler = async (event) => {
  // Handle preflight OPTIONS request sent by the browser for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    // Make a server-side request to the upstream JSON URL
    const upstreamRes = await fetch(UPSTREAM_URL);

    // If upstream fails, forward the status + error message
    if (!upstreamRes.ok) {
      return {
        statusCode: upstreamRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: `Upstream error: ${upstreamRes.status} ${upstreamRes.statusText}`,
        }),
      };
    }

    // Parse the upstream JSON
    const data = await upstreamRes.json();

    // Return the same JSON, with proper CORS + content-type
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("Error in Netlify prayer-times function:", err);

    // Generic 500 response if something goes wrong in the function
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
