import node from "@astrojs/node";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: {
    host: true,
    port: 8080,
  },
  security: {
    allowedDomains: [
      {
        hostname: "comp4020-final-xty116.fly.dev",
        protocol: "https",
      },
    ],
  },
});
