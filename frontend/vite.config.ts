import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Use /job-search/ base on GitHub Pages, / everywhere else
const base = process.env.GITHUB_PAGES === "true" ? "/job-search/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
