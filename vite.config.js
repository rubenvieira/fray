import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// HTTPS in dev so navigator.gpu is available when the page is opened over the LAN
// (WebGPU requires a secure context; plain http works only on localhost).
export default defineConfig({
  plugins: [basicSsl()],
  server: { host: true, port: 5173 },
  build: {
    target: "esnext",
    assetsDir: "assets",
  },
  worker: {
    format: "es",
  },
});
