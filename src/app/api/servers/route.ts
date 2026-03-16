import { NextRequest, NextResponse } from "next/server";
import { HiAnimeEpisodeProvider, resetScraper } from "@/providers/hianime";

export const dynamic = "force-dynamic";

const episodeProvider = new HiAnimeEpisodeProvider();

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing episode id parameter" },
      { status: 400 }
    );
  }

  const result = await episodeProvider.getEpisodeServers(id);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to fetch servers" },
      { status: 500 }
    );
  }

  return NextResponse.json(result.data);
}
