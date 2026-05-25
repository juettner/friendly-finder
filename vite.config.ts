import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/compass.svg"],
      manifest: {
        name: "The Friendly Finder",
        short_name: "Friendly Finder",
        description: "Find the nearest Grain Belt Premium.",
        theme_color: "#c8102e",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/compass.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/bars"),
            handler: "NetworkFirst",
            options: { cacheName: "bars-api-v2", networkTimeoutSeconds: 8 },
          },
        ],
      },
    }),
  ],
});
