import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flouna — AI Decision Engine",
    short_name: "Flouna",
    description:
      "Stop searching, start deciding. The single best option across food and rides.",
    start_url: "/home",
    display: "standalone",
    background_color: "#fff9f6",
    theme_color: "#fff9f6",
    // Two purposes on purpose: "any" keeps the mark intact in the app switcher,
    // while "maskable" lets Android crop to its own shape. These files carry
    // padding around the lotus so that crop can't clip the petals.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
