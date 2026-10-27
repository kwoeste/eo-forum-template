import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { fivePercentReflections, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { serializeUploadedFileUrls } from "@/lib/five-percent";
import { saveUploadedBrowserFile } from "@/lib/storage";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_FILES = 5;

function fileExtension(file: File): string {
  const ext = path.extname(file.name).toLowerCase();
  if (ext && /^\.[a-z0-9]+$/.test(ext)) {
    return ext;
  }
  return EXTENSION_BY_TYPE[file.type] || "";
}

function isAllowedFile(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) {
    return true;
  }

  const ext = path.extname(file.name).toLowerCase();
  return [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"].includes(ext);
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    let member = await db
      .select()
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    if (member.length === 0 && userEmail) {
      member = await db
        .select()
        .from(members)
        .where(eq(members.email, userEmail))
        .limit(1);
    }

    if (member.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Please upload at most ${MAX_FILES} files.` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!isAllowedFile(file)) {
        return NextResponse.json(
          { error: "Please upload a photo (JPEG, PNG, WebP, HEIC) or PDF." },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Each file must be 15MB or smaller." },
          { status: 400 }
        );
      }
    }

    const fileUrls: string[] = [];
    for (const file of files) {
      const filename = `upload-${uuidv4()}${fileExtension(file)}`;
      const saved = await saveUploadedBrowserFile(file, "five-percent", filename);
      fileUrls.push(saved.url);
    }

    const now = new Date();
    const result = await db
      .insert(fivePercentReflections)
      .values({
        memberId: member[0].id,
        pdfUrl: serializeUploadedFileUrls(fileUrls),
        completedAt: now,
      })
      .returning();

    return NextResponse.json({
      message: "Reflection photo uploaded successfully",
      reflection: result[0],
    });
  } catch (error) {
    console.error("Failed to upload 5% reflection photo:", error);
    const message = error instanceof Error ? error.message : "Failed to upload reflection photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
