import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { providers } from "@/providers";
import { Badge } from "@/components/ui/badge";
import { AnimeGrid } from "@/components/anime-grid";
import { AnimeDetailActions } from "@/components/anime-detail-actions";
import { CharacterList } from "@/components/character-list";
import { CommentSection } from "@/components/comment-section";
import { WatchButton } from "@/components/watch-button";
import { auth } from "@/lib/auth";
import {
  Star,
  Captions,
  Mic,
  ChevronRight,
} from "lucide-react";

interface AnimeDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AnimeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const provider = providers.getMetadataProvider();
  const anime = await provider.getById(Number(id));
  if (!anime) return { title: "Anime Not Found" };

  const title = anime.title.english ?? anime.title.romaji;
  return {
    title,
    description: anime.description?.replace(/<[^>]*>/g, "").slice(0, 160),
    openGraph: {
      title,
      images: anime.coverImage?.extraLarge
        ? [anime.coverImage.extraLarge]
        : [],
    },
  };
}

export default async function AnimeDetailPage({
  params,
}: AnimeDetailPageProps) {
  const { id } = await params;
  const anilistId = Number(id);
  if (Number.isNaN(anilistId)) notFound();
  const session = await auth();

  const provider = providers.getMetadataProvider();
  const anime = await provider.getById(anilistId);
  if (!anime) notFound();

  const title = anime.title.english ?? anime.title.romaji;
  const description = anime.description?.replace(/<[^>]*>/g, "") ?? "";
  const score = anime.averageScore
    ? (anime.averageScore / 10).toFixed(1)
    : null;
  const studios =
    anime.studios?.nodes
      ?.filter((s) => s.isAnimationStudio)
      .map((s) => s.name) ?? [];
  const producers =
    anime.studios?.nodes
      ?.filter((s) => !s.isAnimationStudio)
      .map((s) => s.name) ?? [];
  const recommendations =
    anime.recommendations?.nodes
      ?.map((n) => n.mediaRecommendation)
      .filter(Boolean) ?? [];
  const relations =
    anime.relations?.edges?.filter((e) => e.node).map((e) => e.node) ?? [];

  return (
    <div>
      {/* ── Hero Stage (AniWatch-style cover background + poster + info) ── */}
      <div className="relative">
        {/* Blurred cover background */}
        <div className="absolute inset-0 overflow-hidden">
          {anime.coverImage?.extraLarge ? (
            <Image
              src={anime.coverImage.extraLarge}
              alt=""
              fill
              className="object-cover blur-2xl brightness-[0.2] saturate-150"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-zinc-900 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
        </div>

        <div className="container relative mx-auto px-4 pb-8 pt-8 md:pb-12 md:pt-12">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <div className="relative aspect-[3/4] w-44 overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10 md:w-52">
                {anime.coverImage?.extraLarge ? (
                  <Image
                    src={anime.coverImage.extraLarge}
                    alt={title}
                    fill
                    className="object-cover"
                    priority
                    sizes="208px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                    No Image
                  </div>
                )}
              </div>
            </div>

            {/* Detail info */}
            <div className="flex-1 min-w-0 text-center md:text-left">
              {/* Breadcrumb */}
              <nav className="mb-3 flex items-center justify-center gap-1 text-xs text-muted-foreground md:justify-start">
                <a href="/" className="hover:text-foreground">
                  Home
                </a>
                <ChevronRight className="h-3 w-3" />
                {anime.format && (
                  <>
                    <span>{anime.format.replace("_", " ")}</span>
                    <ChevronRight className="h-3 w-3" />
                  </>
                )}
                <span className="text-foreground">{title}</span>
              </nav>

              {/* Title */}
              <h1 className="text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
                {title}
              </h1>
              {anime.title.native && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {anime.title.native}
                </p>
              )}

              {/* Stats row */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                {score && (
                  <span className="flex items-center gap-1 rounded bg-yellow-500/20 px-2 py-0.5 text-sm font-semibold text-yellow-400">
                    <Star className="h-3.5 w-3.5 fill-yellow-400" />
                    {score}
                  </span>
                )}
                <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                  HD
                </span>
                {anime.episodes && (
                  <span className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-xs">
                    <Captions className="h-3 w-3" />
                    {anime.episodes}
                  </span>
                )}
                {anime.episodes && (
                  <span className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-xs">
                    <Mic className="h-3 w-3" />
                    {anime.episodes}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">•</span>
                {anime.format && (
                  <span className="text-xs text-muted-foreground">
                    {anime.format.replace("_", " ")}
                  </span>
                )}
                {anime.duration && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {anime.duration}m
                    </span>
                  </>
                )}
              </div>

              {/* Action buttons — centered */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <WatchButton
                  titles={{
                    english: anime.title.english ?? undefined,
                    romaji: anime.title.romaji,
                    native: anime.title.native ?? undefined,
                  }}
                  anilistId={anilistId}
                />
                <Suspense fallback={null}>
                  <AnimeDetailActions anilistId={anilistId} />
                </Suspense>
              </div>

              {/* Description */}
              <p className="mt-5 line-clamp-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:line-clamp-none">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content below hero ── */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Info grid */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-2 rounded-lg border border-border bg-card p-5 text-sm sm:grid-cols-2">
              {anime.title.native && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Japanese:{" "}
                  </span>
                  <span>{anime.title.native}</span>
                </div>
              )}
              {anime.title.romaji &&
                anime.title.romaji !== title && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Synonyms:{" "}
                    </span>
                    <span>{anime.title.romaji}</span>
                  </div>
                )}
              {anime.startDate && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Aired:{" "}
                  </span>
                  <span>
                    {[
                      anime.startDate.month &&
                        new Date(
                          2000,
                          anime.startDate.month - 1
                        ).toLocaleString("en", { month: "short" }),
                      anime.startDate.day,
                      anime.startDate.year,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    {anime.endDate?.year
                      ? ` to ${[
                          anime.endDate.month &&
                            new Date(
                              2000,
                              anime.endDate.month - 1
                            ).toLocaleString("en", { month: "short" }),
                          anime.endDate.day,
                          anime.endDate.year,
                        ]
                          .filter(Boolean)
                          .join(" ")}`
                      : " to ?"}
                  </span>
                </div>
              )}
              {anime.season && anime.seasonYear && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Premiered:{" "}
                  </span>
                  <span>
                    {anime.season} {anime.seasonYear}
                  </span>
                </div>
              )}
              {anime.duration && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Duration:{" "}
                  </span>
                  <span>{anime.duration}m</span>
                </div>
              )}
              {anime.status && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Status:{" "}
                  </span>
                  <span>{anime.status.replace("_", " ")}</span>
                </div>
              )}
              {score && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    MAL Score:{" "}
                  </span>
                  <span>{score}</span>
                </div>
              )}
              {anime.genres && anime.genres.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="font-medium text-muted-foreground">
                    Genres:{" "}
                  </span>
                  <span className="inline-flex flex-wrap gap-1.5">
                    {anime.genres.map((genre) => (
                      <Badge key={genre} variant="secondary" className="text-xs">
                        {genre}
                      </Badge>
                    ))}
                  </span>
                </div>
              )}
              {studios.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Studios:{" "}
                  </span>
                  <span>{studios.join(", ")}</span>
                </div>
              )}
              {producers.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Producers:{" "}
                  </span>
                  <span>{producers.join(", ")}</span>
                </div>
              )}
              {anime.source && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Source:{" "}
                  </span>
                  <span>{anime.source.replace("_", " ")}</span>
                </div>
              )}
              {anime.format && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Type:{" "}
                  </span>
                  <span>{anime.format.replace("_", " ")}</span>
                </div>
              )}
              {anime.episodes && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Episodes:{" "}
                  </span>
                  <span>{anime.episodes}</span>
                </div>
              )}
            </div>

            {/* Characters */}
            {anime.characters?.edges && anime.characters.edges.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 text-lg font-semibold">
                  Characters & Voice Actors
                </h2>
                <CharacterList characters={anime.characters.edges} />
              </div>
            )}

            {/* Recommendations (main area) */}
            {recommendations.length > 0 && (
              <div className="mt-10">
                <AnimeGrid
                  anime={recommendations}
                  title="Recommended for you"
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80">
            {/* Related Anime */}
            {relations.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-semibold">Related Anime</h2>
                <AnimeGrid anime={relations} title="" />
              </div>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="mt-12">
          <Suspense
            fallback={
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            }
          >
            <CommentSection anilistId={anilistId} isLoggedIn={!!session?.user} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
