import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mismo",
    short_name: "Mismo",
    description: "Find, plan and track the work on your home.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7ef",
    theme_color: "#0b5d41",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
