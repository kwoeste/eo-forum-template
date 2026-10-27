import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { meetings, meetingAgendas } from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meetingDate = searchParams.get("meetingDate");

    if (meetingDate) {
      const [meeting] = await db.select().from(meetings).where(eq(meetings.date, meetingDate));

      if (!meeting) {
        return NextResponse.json({ agenda: null });
      }

      const [agenda] = await db
        .select()
        .from(meetingAgendas)
        .where(eq(meetingAgendas.meetingId, meeting.id))
        .orderBy(desc(meetingAgendas.createdAt))
        .limit(1);

      return NextResponse.json({
        agenda: agenda
          ? {
              id: agenda.id,
              fileName: agenda.fileName,
              fileUrl: agenda.fileUrl,
              fileType: agenda.fileType,
              createdAt: agenda.createdAt,
            }
          : null,
      });
    }

    const allMeetings = await db
      .select({
        meetingId: meetings.id,
        meetingDate: meetings.date,
        meetingTitle: meetings.title,
        agendaId: meetingAgendas.id,
        agendaFileName: meetingAgendas.fileName,
        agendaFileUrl: meetingAgendas.fileUrl,
        agendaCreatedAt: meetingAgendas.createdAt,
      })
      .from(meetings)
      .leftJoin(meetingAgendas, eq(meetingAgendas.meetingId, meetings.id))
      .orderBy(desc(meetings.date));

    const agendaMap = new Map<string, {
      meetingId: string;
      meetingDate: string;
      meetingTitle: string;
      agenda: { id: string; fileName: string; fileUrl: string; createdAt: Date } | null;
    }>();

    for (const row of allMeetings) {
      const existing = agendaMap.get(row.meetingDate);
      if (!existing || (row.agendaCreatedAt && (!existing.agenda || row.agendaCreatedAt > existing.agenda.createdAt))) {
        agendaMap.set(row.meetingDate, {
          meetingId: row.meetingId,
          meetingDate: row.meetingDate,
          meetingTitle: row.meetingTitle,
          agenda: row.agendaId
            ? {
                id: row.agendaId,
                fileName: row.agendaFileName!,
                fileUrl: row.agendaFileUrl!,
                createdAt: row.agendaCreatedAt!,
              }
            : null,
        });
      }
    }

    return NextResponse.json({
      meetings: Array.from(agendaMap.values()),
    });
  } catch (error) {
    console.error("Agendas fetch error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch agendas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
