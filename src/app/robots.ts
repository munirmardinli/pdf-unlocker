import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const getSiteUrl = () =>
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://pdf.mardinli.dev";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: "*",
        disallow: ["/_next/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}