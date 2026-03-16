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
    const message =
      err instanceof Error && err.message.includes("connect")
        ? "Database connection error. Please try again later."
        : "Something went wrong. Please try again.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
