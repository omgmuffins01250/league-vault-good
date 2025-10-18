// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allow CodeSandbox absolute imports to work in Vercel
      "/project/workspace/src": path.resolve(__dirname, "./src"),
      // Optional cleaner alias for new imports
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
