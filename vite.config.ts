import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const backend = "http://127.0.0.1:3000";

export default defineConfig({
  root: "web",
  plugins: [vue()],
  server: {
    port: 5173,
    headers: { "Referrer-Policy": "no-referrer" },
    proxy: { "/api": backend },
  },
});