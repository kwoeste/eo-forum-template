import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { libraryLinks } from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let links;
    if (category) {
      links = await db
        .select()
        .from(libraryLinks)
        .where(eq(libraryLinks.category, category));
    } else {
      links = await db.select().from(libraryLinks);
    }

    return NextResponse.json({ links });
  } catch (error) {
    console.error("Library fetch error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch library";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
