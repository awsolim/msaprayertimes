// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // Tailwind v4 plugin

export default defineConfig({
  plugins: [
    react(),       // React support
    tailwindcss(), // Tailwind CSS processing
  ],
  server: {
    proxy: {
      // Any call to "/api/prayer-times" on localhost:5173
      // is forwarded to https://msauofa.ca/prayer-times
      "/api/prayer-times": {
        target: "https://msauofa.ca",            // remote origin
        changeOrigin: true,                      // spoof Origin header
        secure: true,                            // HTTPS
        rewrite: (path) => path.replace(/^\/api/, ""), // "/api/prayer-times" -> "/prayer-times"
      },
    },
  },
});
