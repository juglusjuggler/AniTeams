import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1).max(64),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input. Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.user.create({
      data: {
        name,
        email,
        hashedPassword,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[REGISTER_ERROR]", err);

    let message = "Something went wrong. Please try again.";
    if (err instanceof Error) {
      if (err.message.includes("connect") || err.message.includes("ECONNREFUSED")) {
        message = "Database connection error. Please try again later.";
      } else if (err.message.includes("Can't reach database") || err.message.includes("P1001")) {
        message = "Database is unreachable. Please try again later.";
      } else if (err.message.includes("table") || err.message.includes("relation") || err.message.includes("P2021")) {
        message = "Database tables not set up. Please contact admin.";
      } else if (err.message.includes("Unique constraint")) {
        message = "An account with this email already exists.";
      } else {
        message = `Server error: ${err.message.slice(0, 150)}`;
      }
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
