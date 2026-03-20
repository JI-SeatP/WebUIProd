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
    port: 5173,
    strictPort: true,
    // Proxy /api/* → local Express (server/api.cjs). Must be running on 3001 or requests fail with ECONNREFUSED.
    proxy: {
      "/api/getLabelPdf.cfm": {
        target: "http://10.4.80.6",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/AutoFAB_SEATPLY_TEST/queries"),
      },
      "/api/getLabelData.cfm": {
        target: "http://10.4.80.6",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/AutoFAB_SEATPLY_TEST/queries"),
      },
      "/api/getStepDetails.cfm": {
        target: "http://10.4.80.6",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/AutoFAB_SEATPLY_TEST/queries"),
      },
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
