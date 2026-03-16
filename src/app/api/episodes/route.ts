import { NextRequest, NextResponse } from "next/server";
import { HiAnimeEpisodeProvider, resetScraper } from "@/providers/hianime";

export const dynamic = "force-dynamic";

const MAX_RETRIES = 2;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing anime id parameter" },
      { status: 400 }
    );
  }

  let lastError = "Failed to fetch episodes";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(1000);
      resetScraper();
    }

    const provider = new HiAnimeEpisodeProvider();
    const result = await provider.getEpisodes(0, id);

    if (result.success && result.data) {
      return NextResponse.json({
        episodes: result.data,
        totalEpisodes: result.data.length,
      }, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    lastError = result.error ?? "Failed to fetch episodes";
  }

  return NextResponse.json(
    { error: lastError },
    { status: 502 }
  );
}
