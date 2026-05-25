import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        // Split vendor + sentry so they cache separately from app code.
        // canvas-confetti is dynamically imported, so Rollup will already
        // emit it as its own chunk on demand.
        manualChunks: {
          vendor: ["react", "react-dom"],
          sentry: ["@sentry/react"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
