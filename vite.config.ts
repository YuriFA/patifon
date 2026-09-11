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
        name: "Patifon",
        short_name: "Patifon",
        description: "Local music library player with a Web Audio equalizer",
        display: "standalone",
        start_url: "/",
        background_color: "#f6f2ec",
        theme_color: "#f6f2ec",
        icons: [
          {
            src: "assets/images/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "assets/images/icon-maskable.svg",
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
