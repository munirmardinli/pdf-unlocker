import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const getSiteUrl = () =>
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://pdf.mardinli.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const siteUrl = getSiteUrl();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}