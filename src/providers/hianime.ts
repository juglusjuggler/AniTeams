import { HiAnime } from "aniwatch";
import type {
  AnimeMedia,
  AnimeSearchResult,
  AnimeSearchFilters,
  EpisodeInfo,
  StreamingLink,
  ProviderResult,
} from "@/types";
import type {
  AnimeMetadataProvider,
  EpisodeProvider,
  StreamingProvider,
} from "@/providers/interfaces";

// ─── Types for HiAnime responses ───────────────────────

export interface HiAnimeEpisode {
  number: number;
  title: string;
  episodeId: string;
  isFiller: boolean;
}

export interface HiAnimeServer {
  serverId: number;
  serverName: string;
}

export interface HiAnimeServersResponse {
  episodeId: string;
  episodeNo: number;
  sub: HiAnimeServer[];
  dub: HiAnimeServer[];
  raw: HiAnimeServer[];
}

export interface HiAnimeSource {
  url: string;
  isM3U8: boolean;
  quality?: string;
}

export interface HiAnimeSubtitle {
  lang: string;
  url: string;
  default?: boolean;
}

export interface HiAnimeSourcesResponse {
  headers: Record<string, string>;
  sources: HiAnimeSource[];
  subtitles: HiAnimeSubtitle[];
  anilistID: number | null;
  malID: number | null;
}

// Singleton scraper instance
const globalForScraper = globalThis as unknown as {
  hianimeScraper: HiAnime.Scraper | undefined;
};

function getScraper(): HiAnime.Scraper {
  if (!globalForScraper.hianimeScraper) {
    globalForScraper.hianimeScraper = new HiAnime.Scraper();
  }
  return globalForScraper.hianimeScraper;
}

export function resetScraper(): void {
  globalForScraper.hianimeScraper = undefined;
}

// ─── HiAnime Episode Provider ──────────────────────────

export class HiAnimeEpisodeProvider implements EpisodeProvider {
  readonly name = "hianime";

  async getEpisodes(
    _animeId: number,
    hiAnimeId?: string
  ): Promise<ProviderResult<EpisodeInfo[]>> {
    if (!hiAnimeId) {
      return {
        success: false,
        error: "HiAnime ID required",
        provider: this.name,
      };
    }

    try {
      const scraper = getScraper();
      const data = await scraper.getEpisodes(hiAnimeId);

      const episodes: EpisodeInfo[] = data.episodes.map((ep) => ({
        number: ep.number,
        title: ep.title || `Episode ${ep.number}`,
        episodeId: ep.episodeId ?? undefined,
        isFiller: ep.isFiller,
      }));

      return {
        success: true,
        data: episodes,
        provider: this.name,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to fetch episodes",
        provider: this.name,
      };
    }
  }

  async getEpisodeServers(
    episodeId: string
  ): Promise<ProviderResult<HiAnimeServersResponse>> {
    try {
      const scraper = getScraper();
      const data = await scraper.getEpisodeServers(episodeId);

      return {
        success: true,
        data: data as unknown as HiAnimeServersResponse,
        provider: this.name,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to fetch servers",
        provider: this.name,
      };
    }
  }

  async getEpisodeSources(
    episodeId: string,
    server?: string,
    category: "sub" | "dub" | "raw" = "sub"
  ): Promise<ProviderResult<HiAnimeSourcesResponse>> {
    try {
      const scraper = getScraper();
      const data = await scraper.getEpisodeSources(
        episodeId,
        server as Parameters<typeof scraper.getEpisodeSources>[1],
        category
      );

      return {
        success: true,
        data: data as unknown as HiAnimeSourcesResponse,
        provider: this.name,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to fetch sources",
        provider: this.name,
      };
    }
  }
}

// ─── HiAnime Streaming Provider ────────────────────────

export class HiAnimeStreamingProvider implements StreamingProvider {
  readonly name = "hianime";

  async getStreamingLinks(
    _animeId: number,
    hiAnimeId?: string
  ): Promise<ProviderResult<StreamingLink[]>> {
    if (!hiAnimeId) {
      return {
        success: false,
        error: "HiAnime ID required",
        provider: this.name,
      };
    }

    return {
      success: true,
      data: [
        {
          provider: "HiAnime",
          url: `/watch/${hiAnimeId}`,
          isLegal: false,
        },
      ],
      provider: this.name,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

// ─── HiAnime Search/Info functions (non-interface) ─────

export async function hiAnimeSearch(
  query: string,
  page: number = 1
) {
  const scraper = getScraper();
  return scraper.search(query, page);
}

export async function hiAnimeGetInfo(animeId: string) {
  const scraper = getScraper();
  return scraper.getInfo(animeId);
}

export async function hiAnimeGetHomePage() {
  const scraper = getScraper();
  return scraper.getHomePage();
}

export async function hiAnimeSearchSuggestions(query: string) {
  const scraper = getScraper();
  return scraper.searchSuggestions(query);
}
