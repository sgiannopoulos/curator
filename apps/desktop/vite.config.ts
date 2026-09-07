import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Tauri controls this dev server, so the port is fixed and its own output is
// left visible in the terminal that launched the app.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: "safari18",
    emptyOutDir: true,
  },
});
