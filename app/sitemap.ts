import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.resi-match.com";

  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/lp1`, lastModified: new Date() },
    { url: `${base}/signup`, lastModified: new Date() },
    { url: `${base}/login`, lastModified: new Date() },
  ];
}