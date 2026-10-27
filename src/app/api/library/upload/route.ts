import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import path from "path";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { libraryLinks } from "@/db/schema";
import { saveUploadedBrowserFile } from "@/lib/storage";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024;

function fileExtension(file: File): string {
  const ext = path.extname(file.name).toLowerCase();
  if (ext && /^\.[a-z0-9]+$/.test(ext)) {
    return ext;
  }
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const title = String(formData.get("title") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const description = String(formData.get("description") || "").trim() || null;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type) && !fileExtension(file)) {
      return NextResponse.json(
        { error: "Please upload a PDF or image file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 15MB." },
        { status: 400 }
      );
    }

    const ext = fileExtension(file) || ".pdf";
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    const filename = `${safeTitle}-${Date.now()}${ext}`;
    const saved = await saveUploadedBrowserFile(file, "library", filename);

    const existing = await db
      .select()
      .from(libraryLinks)
      .where(and(eq(libraryLinks.title, title), eq(libraryLinks.category, category)))
      .limit(1);

    let result;
    if (existing.length > 0) {
      [result] = await db
        .update(libraryLinks)
        .set({
          fileUrl: saved.url,
          description,
        })
        .where(eq(libraryLinks.id, existing[0].id))
        .returning();
    } else {
      [result] = await db
        .insert(libraryLinks)
        .values({
          title,
          fileUrl: saved.url,
          description,
          category,
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      fileUrl: saved.url,
      fileName: file.name,
      libraryLink: result,
    });
  } catch (error) {
    console.error("Library upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
