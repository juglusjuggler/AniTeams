import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_SIZE = 200 * 1024; // 200KB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      // Clear avatar
      await db.user.update({
        where: { id: session.user.id },
        data: { image: null },
      });
      return NextResponse.json({ success: true, image: null });
    }

    // Validate: must be a data URL (base64 image) or an https URL
    if (typeof image !== "string") {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }

    if (image.startsWith("data:image/")) {
      // Base64 data URL — check size
      if (image.length > MAX_SIZE * 1.37) {
        // base64 is ~37% larger than binary
        return NextResponse.json(
          { error: "Image too large. Max 200KB." },
          { status: 400 }
        );
      }
      // Validate it's a real image type
      const mime = image.match(/^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,/);
      if (!mime) {
        return NextResponse.json(
          { error: "Invalid image format. Use PNG, JPEG, GIF, or WebP." },
          { status: 400 }
        );
      }
    } else if (image.startsWith("https://")) {
      if (image.length > 2048) {
        return NextResponse.json({ error: "URL too long" }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: "Image must be a valid HTTPS URL or uploaded file" },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { image },
    });

    return NextResponse.json({ success: true, image });
  } catch (err) {
    console.error("[AVATAR_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to update avatar" },
      { status: 500 }
    );
  }
}
