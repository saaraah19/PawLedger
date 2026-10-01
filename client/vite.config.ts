import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In development the API is same-origin from the browser's point of view.
    proxy: { "/api": "http://localhost:4000" },
  },
});
