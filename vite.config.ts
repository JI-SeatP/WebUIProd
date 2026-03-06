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
    // Proxy API calls to local Express server (direct SQL Server connection)
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
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
