import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["assets/images/icon.svg"],
      manifest: {
        name: "Audio Player",
        short_name: "Audio Player",
        description: "Local music library player with a Web Audio equalizer",
        display: "standalone",
        start_url: "/",
        background_color: "#262f35",
        theme_color: "#262f35",
        icons: [
          {
            src: "assets/images/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "assets/images/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
