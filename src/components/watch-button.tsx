"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HiAnimeResult {
  id: string;
  name: string;
  poster: string;
  episodes?: { sub: number; dub: number };
}

interface WatchButtonProps {
  titles: {
    english?: string;
    romaji: string;
    native?: string;
  };
  anilistId: number;
}

/** Simple similarity score between two strings (0-1) */
function similarity(a: string, b: string): number {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return 1;
  if (al.includes(bl) || bl.includes(al)) return 0.8;

  // Jaccard similarity on words
  const wordsA = new Set(al.split(/\s+/));
  const wordsB = new Set(bl.split(/\s+/));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function bestMatch(
  results: HiAnimeResult[],
  titles: WatchButtonProps["titles"]
): HiAnimeResult | null {
  const candidates = [titles.english, titles.romaji, titles.native].filter(
    Boolean
  ) as string[];

  let best: HiAnimeResult | null = null;
  let bestScore = 0;

  for (const result of results) {
    for (const title of candidates) {
      const score = similarity(result.name, title);
      if (score > bestScore) {
        bestScore = score;
        best = result;
      }
    }
  }

  // Only auto-select if reasonable similarity
  return bestScore >= 0.5 ? best : null;
}

export function WatchButton({ titles }: WatchButtonProps) {
  const [hiAnimeId, setHiAnimeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<HiAnimeResult[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function findAnime() {
      // Try each title variant in order until we get a good match
      const queries = [
        titles.english,
        titles.romaji,
        titles.native,
      ].filter(Boolean) as string[];

      let allResults: HiAnimeResult[] = [];
      let matched: HiAnimeResult | null = null;

      for (const query of queries) {
        try {
          const res = await fetch(
            `/api/hianime/search?q=${encodeURIComponent(query)}`
          );
          if (!res.ok) continue;
          const data = await res.json();
          const animes: HiAnimeResult[] = data.animes ?? [];

          if (animes.length === 0) continue;

          // Check for good match
          matched = bestMatch(animes, titles);
          allResults = animes;

          if (matched) break; // Found a good match, stop searching

          // If first query got results but no match, keep them as fallback
          if (allResults.length === 0) allResults = animes;
        } catch {
          // Try next query
        }
      }

      if (cancelled) return;

      // Sort results by similarity to any title variant
      const candidates = [titles.english, titles.romaji, titles.native].filter(
        Boolean
      ) as string[];
      allResults.sort((a, b) => {
        const scoreA = Math.max(...candidates.map((t) => similarity(a.name, t)));
        const scoreB = Math.max(...candidates.map((t) => similarity(b.name, t)));
        return scoreB - scoreA;
      });

      setSearchResults(allResults);
      if (matched) {
        setHiAnimeId(matched.id);
      } else if (allResults.length === 1) {
        setHiAnimeId(allResults[0].id);
      }
      setLoading(false);
    }

    findAnime();
    return () => { cancelled = true; };
  }, [titles.english, titles.romaji, titles.native]);

  if (loading) {
    return (
      <Button disabled className="gap-2 rounded-full px-6 py-3 text-base">
        <Loader2 className="h-5 w-5 animate-spin" />
        Finding streams...
      </Button>
    );
  }

  if (hiAnimeId) {
    return (
      <div className="relative flex gap-2">
        <Link href={`/watch/${hiAnimeId}`}>
          <Button size="lg" className="gap-2 rounded-full bg-primary px-8 py-3 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/30">
            <Play className="h-5 w-5 fill-current" />
            Watch now
          </Button>
        </Link>
        {searchResults.length > 1 && (
          <Button
            variant="outline"
            size="lg"
            className="rounded-full"
            onClick={() => setShowPicker(!showPicker)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
        {showPicker && (
          <div className="absolute z-50 mt-12 max-h-64 w-80 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-xl">
            <p className="mb-2 text-xs text-muted-foreground">Choose version:</p>
            {searchResults.map((r) => (
              <Link
                key={r.id}
                href={`/watch/${r.id}`}
                className="block rounded-md px-3 py-2 text-sm hover:bg-secondary"
                onClick={() => setShowPicker(false)}
              >
                {r.name}
                {r.episodes && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Sub: {r.episodes.sub}, Dub: {r.episodes.dub || "—"})
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (searchResults.length > 0) {
    return (
      <div className="relative">
        <Button
          size="lg"
          className="gap-2 rounded-full bg-primary px-8 py-3 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
          onClick={() => setShowPicker(!showPicker)}
        >
          <Play className="h-5 w-5" />
          Watch now
        </Button>
        {showPicker && (
          <div className="absolute z-50 mt-2 max-h-64 w-80 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-xl">
            <p className="mb-2 text-xs text-muted-foreground">
              Select the correct version:
            </p>
            {searchResults.map((r) => (
              <Link
                key={r.id}
                href={`/watch/${r.id}`}
                className="block rounded-md px-3 py-2 text-sm hover:bg-secondary"
                onClick={() => setShowPicker(false)}
              >
                {r.name}
                {r.episodes && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Sub: {r.episodes.sub}, Dub: {r.episodes.dub || "—"})
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Button disabled variant="outline" className="gap-2 rounded-full px-6 py-3 text-base">
      <Play className="h-5 w-5" />
      Stream unavailable
    </Button>
  );
}
                onClick={() => setShowPicker(false)}
              >
                {r.name}
                {r.episodes && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Sub: {r.episodes.sub}, Dub: {r.episodes.dub})
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
