import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PDF Unlocker",
    short_name: "PDF Unlocker",
    description:
      "Entsperre PDF-Dateien lokal im Browser. Entferne Bearbeitungssperren schnell, sicher und ohne Upload auf fremde Server.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#2563eb",
    lang: "de",
    id: "/",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}