import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { treasurerReports } from "@/db/schema";
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db
      .select()
      .from(treasurerReports)
      .where(eq(treasurerReports.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
    const safeTitle = existing[0].title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    const filename = `${safeTitle}-${Date.now()}${ext}`;
    const saved = await saveUploadedBrowserFile(file, "treasurer", filename);

    const [report] = await db
      .update(treasurerReports)
      .set({
        fileName: file.name,
        fileUrl: saved.url,
        updatedAt: new Date(),
      })
      .where(eq(treasurerReports.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Failed to update treasurer report:", error);
    const message = error instanceof Error ? error.message : "Failed to update report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
