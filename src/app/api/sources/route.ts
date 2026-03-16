import { NextRequest, NextResponse } from "next/server";
import { HiAnimeEpisodeProvider, resetScraper } from "@/providers/hianime";

export const dynamic = "force-dynamic";

const MAX_SERVER_RETRIES = 3;
const RETRY_DELAYS = [0, 800, 1500];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  const server = searchParams.get("server") ?? undefined;
  const category = searchParams.get("category") ?? "sub";

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing episode id parameter" },
      { status: 400 }
    );
  }

  if (!["sub", "dub", "raw"].includes(category)) {
    return NextResponse.json(
      { error: "Invalid category. Must be sub, dub, or raw" },
      { status: 400 }
    );
  }

  let lastError = "Failed to fetch sources";

  for (let attempt = 0; attempt < MAX_SERVER_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS[attempt] ?? 1500);
      // Reset scraper on retry to get a fresh instance
      resetScraper();
    }

    const provider = new HiAnimeEpisodeProvider();
    const result = await provider.getEpisodeSources(
      id,
      server,
      category as "sub" | "dub" | "raw"
    );

    if (result.success && result.data) {
      return NextResponse.json(result.data, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    lastError = result.error ?? "Failed to fetch sources";
  }

  return NextResponse.json(
    { error: lastError },
    { status: 502 }
  );
}
