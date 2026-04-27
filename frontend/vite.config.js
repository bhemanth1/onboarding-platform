import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    proxy: {
      "/dana-aegis/api": "http://127.0.0.1:5000",
      "/dana-aegis/health": "http://127.0.0.1:5000"
    }
  }
});
