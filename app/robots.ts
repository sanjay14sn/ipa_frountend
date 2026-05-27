import type { MetadataRoute } from "next";

/**
 * robots.ts — Disallow all crawlers.
 *
 * This is a private franchise-management portal. No page should ever appear in
 * search results, and the robots file ensures well-behaved crawlers respect that.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
