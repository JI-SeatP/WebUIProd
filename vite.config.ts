import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Proxy API calls to ColdFusion server during development
    proxy: {
      "/api": {
        target: "http://localhost:8500", // ColdFusion server
        changeOrigin: true,
      },
    },
  },
});
