"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VideoPlayer } from "@/components/watch/video-player";
import { EpisodeList } from "@/components/watch/episode-list";
import { CategorySelector } from "@/components/watch/category-selector";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";

interface Episode {
  number: number;
  title?: string;
  episodeId?: string;
  isFiller?: boolean;
}

interface ServersData {
  sub: Array<{ serverId: number; serverName: string }>;
  dub: Array<{ serverId: number; serverName: string }>;
  raw: Array<{ serverId: number; serverName: string }>;
}

interface SourcesData {
  sources: Array<{ url: string; isM3U8: boolean; quality?: string }>;
  subtitles: Array<{ lang: string; url: string; default?: boolean }>;
  headers?: { Referer?: string };
}

interface WatchPlayerProps {
  animeId: string;
  animeTitle: string;
  initialEpisodeId?: string;
  poster?: string;
}

export function WatchPlayer({
  animeId,
  animeTitle,
  initialEpisodeId,
  poster,
}: WatchPlayerProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [category, setCategory] = useState<"sub" | "dub" | "raw">("sub");
  const [hasSub, setHasSub] = useState(true);
  const [hasDub, setHasDub] = useState(false);
  const [hasRaw, setHasRaw] = useState(false);
  const [sources, setSources] = useState<SourcesData | null>(null);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [loadingSources, setLoadingSources] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const sourcesAbortRef = useRef<AbortController | null>(null);

  // Fetch episodes
  useEffect(() => {
    setLoadingEpisodes(true);
    setError(null);

    const abort = new AbortController();

    fetch(`/api/episodes?id=${encodeURIComponent(animeId)}`, {
      signal: abort.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load episodes");
        return r.json();
      })
      .then((data) => {
        const eps: Episode[] = data.episodes ?? [];
        setEpisodes(eps);

        if (initialEpisodeId) {
          const found = eps.find((e: Episode) => e.episodeId === initialEpisodeId);
          if (found) {
            setCurrentEpisode(found);
            return;
          }
        }
        if (eps.length > 0) {
          setCurrentEpisode(eps[0]);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoadingEpisodes(false));

    return () => abort.abort();
  }, [animeId, initialEpisodeId]);

  // Fetch servers to determine available categories
  useEffect(() => {
    if (!currentEpisode?.episodeId) return;

    const abort = new AbortController();

    fetch(`/api/servers?id=${encodeURIComponent(currentEpisode.episodeId)}`, {
      signal: abort.signal,
    })
      .then((r) => {
        if (!r.ok) return;
        return r.json();
      })
      .then((data: ServersData | undefined) => {
        if (!data || abort.signal.aborted) return;
        setHasSub(data.sub.length > 0);
        setHasDub(data.dub.length > 0);
        setHasRaw(data.raw.length > 0);

        if (data.sub.length > 0) setCategory("sub");
        else if (data.dub.length > 0) setCategory("dub");
        else if (data.raw.length > 0) setCategory("raw");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setHasSub(true);
      });

    return () => abort.abort();
  }, [currentEpisode?.episodeId]);

  // Fetch sources when episode or category changes (with auto-retry)
  useEffect(() => {
    if (!currentEpisode?.episodeId) return;

    // Abort any in-flight sources request
    sourcesAbortRef.current?.abort();
    const abort = new AbortController();
    sourcesAbortRef.current = abort;

    setLoadingSources(true);
    setSources(null);
    setError(null);

    const MAX_RETRIES = 5;

    async function fetchSources(attempt: number) {
      if (abort.signal.aborted) return;

      const params = new URLSearchParams({
        id: currentEpisode!.episodeId!,
        category,
      });

      try {
        const r = await fetch(`/api/sources?${params}`, {
          signal: abort.signal,
        });

        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.error || `Server error (${r.status})`);
        }

        const data: SourcesData = await r.json();

        if (!data.sources || data.sources.length === 0) {
          throw new Error("No video sources available");
        }

        if (!abort.signal.aborted) {
          setSources(data);
          setError(null);
          setLoadingSources(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;

        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s, 6s
          const delay = Math.min(1000 * Math.pow(1.5, attempt - 1), 6000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          if (!abort.signal.aborted) {
            return fetchSources(attempt + 1);
          }
        } else if (!abort.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load video. Try a different language option."
          );
          setLoadingSources(false);
        }
      }
    }

    fetchSources(1);

    return () => {
      abort.abort();
    };
  }, [currentEpisode?.episodeId, category, retryCount]);

  const handleEpisodeSelect = useCallback((ep: Episode) => {
    setCurrentEpisode(ep);
    setError(null);
  }, []);

  const referer = sources?.headers?.Referer;

  const proxyUrl = (url: string) => {
    const params = new URLSearchParams({ url });
    if (referer) params.set("referer", referer);
    return `/api/proxy?${params}`;
  };

  const videoSrc =
    sources?.sources?.find((s) => s.isM3U8)?.url ??
    sources?.sources?.[0]?.url ??
    "";

  const proxiedSrc = videoSrc ? proxyUrl(videoSrc) : "";

  const proxiedSubtitles = sources?.subtitles?.map((sub) => ({
    ...sub,
    url: proxyUrl(sub.url),
  }));

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Main player area */}
      <div className="flex-1 min-w-0">
        {loadingSources ? (
          <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-black">
            <Loader2 className="h-10 w-10 animate-spin text-white/50" />
          </div>
        ) : proxiedSrc ? (
          <VideoPlayer
            src={proxiedSrc}
            subtitles={proxiedSubtitles}
            poster={poster}
          />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg bg-muted">
            {error ? (
              <>
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="max-w-md text-center text-sm text-destructive">{error}</p>
                <button
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="mt-2 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry
                </button>
              </>
            ) : (
              <p className="text-muted-foreground">
                Select an episode to start watching
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">{animeTitle}</h1>
            {currentEpisode && (
              <p className="mt-1 text-muted-foreground">
                Episode {currentEpisode.number}
                {currentEpisode.title &&
                  currentEpisode.title !== `Episode ${currentEpisode.number}`
                  ? ` — ${currentEpisode.title}`
                  : ""}
              </p>
            )}
          </div>
          <CategorySelector
            hasSub={hasSub}
            hasDub={hasDub}
            hasRaw={hasRaw}
            activeCategory={category}
            onCategoryChange={setCategory}
          />
        </div>
      </div>

      {/* Episode sidebar */}
      <div className="w-full lg:w-80 xl:w-96">
        {loadingEpisodes ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <EpisodeList
            episodes={episodes}
            currentEpisodeId={currentEpisode?.episodeId}
            onEpisodeSelect={handleEpisodeSelect}
            animeTitle={animeTitle}
          />
        )}
      </div>
    </div>
  );
}
