import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { retreats, retreatAttendees, members } from "@/db/schema";

interface AttendeeInput {
  memberId: string;
  name: string;
  status: "pending" | "in" | "out";
  hasPaid: boolean;
  paidAmount: number;
  notes: string;
}

interface RetreatInput {
  title: string;
  startDate: string;
  endDate: string;
  nightCount: string;
  location: string;
  venue: string;
  lodgingDetails: string;
  lodgingLink: string;
  estimatedCost: string;
  perPersonCost: string;
  depositAmount: string;
  planningNotes: string;
  dailySchedule: string;
  travelLogistics: string;
  mealsInfo: string;
  roomsInfo: string;
  packingList: string;
}

function parseIntOrNull(value: string | undefined | null): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

function parseDateOrNull(value: string | undefined | null): string | null {
  if (!value || value.trim() === "") return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(value) ? value : null;
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
      return NextResponse.json({ retreat: null, attendees: [] });
    }

    const retreat = activeRetreat[0];

    const attendeeRows = await db
      .select({
        id: retreatAttendees.id,
        memberId: retreatAttendees.memberId,
        status: retreatAttendees.status,
        hasPaid: retreatAttendees.hasPaid,
        paidAmount: retreatAttendees.paidAmount,
        notes: retreatAttendees.notes,
        memberName: members.name,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
        memberEmail: members.email,
      })
      .from(retreatAttendees)
      .leftJoin(members, eq(retreatAttendees.memberId, members.id))
      .where(eq(retreatAttendees.retreatId, retreat.id));

    const attendees = attendeeRows.map((row) => {
      const name =
        row.memberName ||
        [row.memberFirstName, row.memberLastName].filter(Boolean).join(" ") ||
        row.memberEmail ||
        "Unknown";
      return {
        memberId: row.memberId,
        name,
        status: row.status as "pending" | "in" | "out",
        hasPaid: row.hasPaid,
        paidAmount: row.paidAmount ?? 0,
        notes: row.notes ?? "",
      };
    });

    return NextResponse.json({
      retreat: {
        id: retreat.id,
        title: retreat.title ?? "",
        startDate: retreat.startDate ?? "",
        endDate: retreat.endDate ?? "",
        nightCount: retreat.nightCount?.toString() ?? "",
        location: retreat.location ?? "",
        venue: retreat.venue ?? "",
        lodgingDetails: retreat.lodgingDetails ?? "",
        lodgingLink: retreat.lodgingLink ?? "",
        estimatedCost: retreat.estimatedCost?.toString() ?? "",
        perPersonCost: retreat.perPersonCost?.toString() ?? "",
        depositAmount: retreat.depositAmount?.toString() ?? "",
        planningNotes: retreat.planningNotes ?? "",
        dailySchedule: retreat.dailySchedule ?? "",
        travelLogistics: retreat.travelLogistics ?? "",
        mealsInfo: retreat.mealsInfo ?? "",
        roomsInfo: retreat.roomsInfo ?? "",
        packingList: retreat.packingList ?? "",
      },
      attendees,
    });
  } catch (error) {
    console.error("Failed to fetch retreat:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch retreat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const retreatInput: RetreatInput = body.retreat;
    const attendeesInput: AttendeeInput[] = body.attendees || [];

    if (!retreatInput) {
      return NextResponse.json({ error: "Missing retreat data" }, { status: 400 });
    }

    const existingRetreat = await db
      .select()
      .from(retreats)
      .where(eq(retreats.isArchived, false))
      .orderBy(desc(retreats.createdAt))
      .limit(1);

    let retreatId: string;

    const retreatValues = {
      title: retreatInput.title || null,
      startDate: parseDateOrNull(retreatInput.startDate),
      endDate: parseDateOrNull(retreatInput.endDate),
      nightCount: parseIntOrNull(retreatInput.nightCount),
      location: retreatInput.location || null,
      venue: retreatInput.venue || null,
      lodgingDetails: retreatInput.lodgingDetails || null,
      lodgingLink: retreatInput.lodgingLink || null,
      estimatedCost: parseIntOrNull(retreatInput.estimatedCost),
      perPersonCost: parseIntOrNull(retreatInput.perPersonCost),
      depositAmount: parseIntOrNull(retreatInput.depositAmount),
      planningNotes: retreatInput.planningNotes || null,
      dailySchedule: retreatInput.dailySchedule || null,
      travelLogistics: retreatInput.travelLogistics || null,
      mealsInfo: retreatInput.mealsInfo || null,
      roomsInfo: retreatInput.roomsInfo || null,
      packingList: retreatInput.packingList || null,
      updatedAt: new Date(),
    };

    if (existingRetreat.length > 0) {
      retreatId = existingRetreat[0].id;
      await db
        .update(retreats)
        .set(retreatValues)
        .where(eq(retreats.id, retreatId));
    } else {
      const [newRetreat] = await db
        .insert(retreats)
        .values({
          ...retreatValues,
          isArchived: false,
        })
        .returning();
      retreatId = newRetreat.id;
    }

    const allMembers = await db.select().from(members);
    const membersByName = new Map<string, string>();
    for (const m of allMembers) {
      const name =
        m.name ||
        [m.firstName, m.lastName].filter(Boolean).join(" ") ||
        m.email ||
        "";
      if (name) {
        membersByName.set(name.toLowerCase(), m.id);
      }
    }

    await db
      .delete(retreatAttendees)
      .where(eq(retreatAttendees.retreatId, retreatId));

    const attendeeInserts = [];
    for (const att of attendeesInput) {
      const memberId = membersByName.get(att.name.toLowerCase());
      if (memberId) {
        attendeeInserts.push({
          retreatId,
          memberId,
          status: att.status,
          hasPaid: att.hasPaid,
          paidAmount: att.paidAmount || null,
          notes: att.notes || null,
        });
      }
    }

    if (attendeeInserts.length > 0) {
      await db.insert(retreatAttendees).values(attendeeInserts);
    }

    return NextResponse.json({ success: true, retreatId });
  } catch (error) {
    console.error("Failed to save retreat:", error);
    const message = error instanceof Error ? error.message : "Failed to save retreat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
