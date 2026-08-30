import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),       // React support
    tailwindcss(), // Tailwind CSS integration
  ],
  // Vite does not execute the Vercel functions in /api during local
  // development, so forward those requests to the deployed backend.
  server: {
    proxy: {
      "/api/events": {
        target: "https://msaprayertimes.vercel.app",
        changeOrigin: true,
        secure: false,
      },
      "/api/hadith": {
        target: "https://msaprayertimes.vercel.app",
        changeOrigin: true,
        secure: false,
      },
      "/api/display-config": {
        target: "https://msaprayertimes.vercel.app",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
