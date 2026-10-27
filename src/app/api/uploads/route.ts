import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { saveUploadedBrowserFile } from "@/lib/storage";

const ALLOWED_FOLDERS = new Set([
  "photos",
  "lifelines",
  "agendas",
  "five-percent",
  "treasurer",
  "library",
  "bug-reports",
]);

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
    const folder = String(formData.get("folder") || "");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type) && !fileExtension(file)) {
      return NextResponse.json(
        { error: "Please upload a photo or PDF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 15MB." },
        { status: 400 }
      );
    }

    const filename = `${uuidv4()}${fileExtension(file)}`;
    const saved = await saveUploadedBrowserFile(file, folder, filename);

    return NextResponse.json({
      success: true,
      fileUrl: saved.url,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
