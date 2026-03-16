import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {
    status: "ok",
    database: "unknown",
    database_url: process.env.DATABASE_URL ? "set" : "NOT SET",
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "connected";
  } catch (err) {
    checks.database = `error: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}`;
    checks.status = "degraded";
  }

  try {
    // Check if User table exists
    const count = await db.user.count();
    checks.user_table = `ok (${count} users)`;
  } catch (err) {
    checks.user_table = `error: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}`;
    checks.status = "degraded";
  }

  return NextResponse.json(checks, {
    status: checks.status === "ok" ? 200 : 503,
  });
}
