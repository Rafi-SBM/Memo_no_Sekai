import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // The app shell is public; the notes API answers only to this origin.
      { userAgent: "*", allow: "/", disallow: "/api/" },
    ],
  };
}
