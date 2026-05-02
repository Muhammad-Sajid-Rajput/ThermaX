import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          maps: ["leaflet", "leaflet.heat", "react-leaflet"],
          charts: ["recharts"],
          network: ["axios", "react-hot-toast"],
        },
      },
    },
  },
});
