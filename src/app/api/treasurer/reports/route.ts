import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import path from "path";
import { desc } from "drizzle-orm";
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

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reports = await db
      .select()
      .from(treasurerReports)
      .orderBy(desc(treasurerReports.reportDate));

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Failed to fetch treasurer reports:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch reports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const title = String(formData.get("title") || "").trim();
    const reportDate = String(formData.get("date") || "").trim();
    const balanceStr = String(formData.get("balance") || "").trim();
    const notes = String(formData.get("notes") || "").trim() || null;
    const file = formData.get("file");

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      return NextResponse.json({ error: "Valid date is required" }, { status: 400 });
    }

    const balance = balanceStr ? parseInt(balanceStr, 10) : null;

    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (file instanceof File && file.size > 0) {
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
      const saved = await saveUploadedBrowserFile(file, "treasurer", filename);
      fileUrl = saved.url;
      fileName = file.name;
    }

    const [report] = await db
      .insert(treasurerReports)
      .values({
        title,
        reportDate,
        balance,
        notes,
        fileName,
        fileUrl,
      })
      .returning();

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Failed to create treasurer report:", error);
    const message = error instanceof Error ? error.message : "Failed to create report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
