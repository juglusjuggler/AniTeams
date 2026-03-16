import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { providers } from "@/providers";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://aniteams.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/login`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const genres = [
    "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror",
    "Isekai", "Mecha", "Music", "Mystery", "Psychological", "Romance",
    "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
    "Ecchi", "Mahou Shoujo", "School", "Shoujo", "Shounen",
  ];

  const genrePages: MetadataRoute.Sitemap = genres.map((genre) => ({
    url: `${SITE_URL}/search?genre=${encodeURIComponent(genre)}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Fetch anime IDs from database (watched, bookmarked, commented)
  let dbAnimeIds: number[] = [];
  try {
    const animeRecords = await db.anime.findMany({
      select: { anilistId: true, updatedAt: true },
      orderBy: { popularity: "desc" },
      take: 5000,
    });
    dbAnimeIds = animeRecords.map((a) => a.anilistId);
  } catch {
    // DB not available, skip
  }

  // Fetch trending + popular from AniList for discovery
  const anilistIds = new Set<number>(dbAnimeIds);
  try {
    const provider = providers.getMetadataProvider();
    const [trending, popular] = await Promise.all([
      provider.getTrending(1, 50),
      provider.getPopular(1, 50),
    ]);
    for (const anime of [...trending.media, ...popular.media]) {
      anilistIds.add(anime.id);
    }
  } catch {
    // AniList API down, use DB IDs only
  }

  const animePages: MetadataRoute.Sitemap = Array.from(anilistIds).map(
    (id) => ({
      url: `${SITE_URL}/anime/${id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  );

  return [...staticPages, ...genrePages, ...animePages];
}
}
