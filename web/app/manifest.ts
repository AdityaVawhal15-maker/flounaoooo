import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Radiues — AI Decision Engine",
    short_name: "Radiues",
    description:
      "Stop searching, start deciding. The single best option across food and rides.",
    start_url: "/home",
    display: "standalone",
    background_color: "#fff9f6",
    theme_color: "#fff9f6",
    icons: [
      {
        src: "/logo.png",
        sizes: "500x500",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
