import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import path from "path";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { retreats, retreatAgendas, members } from "@/db/schema";
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

async function getOrCreateActiveRetreat(): Promise<string> {
  const existing = await db
    .select()
    .from(retreats)
    .where(eq(retreats.isArchived, false))
    .orderBy(desc(retreats.createdAt))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [newRetreat] = await db
    .insert(retreats)
    .values({
      title: "Upcoming Retreat",
      isArchived: false,
    })
    .returning();

  return newRetreat.id;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeRetreat = await db
      .select()
      .from(retreats)
      .where(eq(retreats.isArchived, false))
      .orderBy(desc(retreats.createdAt))
      .limit(1);

    if (activeRetreat.length === 0) {
      return NextResponse.json({ agendas: [] });
    }

    const agendas = await db
      .select()
      .from(retreatAgendas)
      .where(eq(retreatAgendas.retreatId, activeRetreat[0].id))
      .orderBy(desc(retreatAgendas.createdAt));

    return NextResponse.json({
      agendas: agendas.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileType: a.fileType,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch retreat agendas:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch agendas";
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

    const retreatId = await getOrCreateActiveRetreat();

    const ext = fileExtension(file) || ".pdf";
    const filename = `retreat-agenda-${Date.now()}${ext}`;
    const saved = await saveUploadedBrowserFile(file, "retreat", filename);

    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    const [agenda] = await db
      .insert(retreatAgendas)
      .values({
        retreatId,
        fileName: file.name,
        fileUrl: saved.url,
        fileType: file.type || null,
        fileSize: file.size,
        uploadedBy: member?.id ?? null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      agenda: {
        id: agenda.id,
        fileName: agenda.fileName,
        fileUrl: agenda.fileUrl,
        fileType: agenda.fileType,
        createdAt: agenda.createdAt,
      },
    });
  } catch (error) {
    console.error("Retreat agenda upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
