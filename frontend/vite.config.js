import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite configuration.
// - Dev server runs on http://localhost:5173
// - /api/* requests are proxied to the local Flask backend (localhost:5000),
//   avoiding CORS issues during local development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          xlsx: ["xlsx"],
        },
      },
    },
  },
});
