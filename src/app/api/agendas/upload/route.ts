import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings, meetingAgendas, members } from "@/db/schema";
import { saveUploadedBrowserFile } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const meetingDate = formData.get("meetingDate") as string;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!meetingDate || !/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) {
      return NextResponse.json({ error: "Invalid meeting date" }, { status: 400 });
    }

    const ext = path.extname(file.name);
    const filename = `agenda-${meetingDate}-${Date.now()}${ext}`;
    const saved = await saveUploadedBrowserFile(file, "agendas", filename);

    let [meeting] = await db.select().from(meetings).where(eq(meetings.date, meetingDate));

    if (!meeting) {
      const [newMeeting] = await db.insert(meetings).values({
        title: "Forum Meeting",
        date: meetingDate,
        startTime: "12:00",
        endTime: "16:30",
        location: null,
      }).returning();
      meeting = newMeeting;
    }

    const [member] = await db.select().from(members).where(eq(members.clerkUserId, userId));

    const [agenda] = await db.insert(meetingAgendas).values({
      meetingId: meeting.id,
      fileName: file.name,
      fileUrl: saved.url,
      fileType: file.type || null,
      fileSize: file.size,
      uploadedBy: member?.id ?? null,
    }).returning();

    return NextResponse.json({
      success: true,
      fileUrl: saved.url,
      fileName: file.name,
      meetingDate,
      agendaId: agenda.id,
    });
  } catch (error) {
    console.error("Agenda upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
