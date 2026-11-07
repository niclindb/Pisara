import type { MetadataRoute } from "next";

// Search engines may list the landing page, the topic browser and the free
// previews. Everything personal or private stays out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/author", "/api/", "/auth/", "/email/", "/home", "/lessons/", "/history", "/progress", "/recap/", "/settings", "/topics", "/onboarding"],
    },
  };
}
