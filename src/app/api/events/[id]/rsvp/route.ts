import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { calendarEvents, eventAttendees, members } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

type RsvpStatus = 'accepted' | 'declined' | 'pending';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status: RsvpStatus };

    const validStatuses: RsvpStatus[] = ['accepted', 'declined', 'pending'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: accepted, declined, pending' },
        { status: 400 }
      );
    }

    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const [member] = await db
      .select({ id: members.id, email: members.email })
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    if (!member || !member.email) {
      return NextResponse.json(
        { error: 'Member not found or email missing' },
        { status: 404 }
      );
    }

    const [existingAttendee] = await db
      .select()
      .from(eventAttendees)
      .where(
        and(
          eq(eventAttendees.eventId, id),
          eq(eventAttendees.email, member.email)
        )
      )
      .limit(1);

    let attendee;
    if (existingAttendee) {
      [attendee] = await db
        .update(eventAttendees)
        .set({
          rsvpStatus: status,
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(eventAttendees.id, existingAttendee.id))
        .returning();
    } else {
      [attendee] = await db
        .insert(eventAttendees)
        .values({
          eventId: id,
          memberId: member.id,
          email: member.email,
          rsvpStatus: status,
          respondedAt: new Date(),
        })
        .returning();
    }

    return NextResponse.json({
      message: `RSVP updated to ${status}`,
      attendee: {
        id: attendee.id,
        email: attendee.email,
        rsvpStatus: attendee.rsvpStatus,
        respondedAt: attendee.respondedAt,
      },
    });
  } catch (error) {
    console.error('Failed to update RSVP:', error);
    return NextResponse.json(
      { error: 'Failed to update RSVP' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [member] = await db
      .select({ id: members.id, email: members.email })
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    if (!member || !member.email) {
      return NextResponse.json({ rsvpStatus: null });
    }

    const [attendee] = await db
      .select({ rsvpStatus: eventAttendees.rsvpStatus })
      .from(eventAttendees)
      .where(
        and(
          eq(eventAttendees.eventId, id),
          eq(eventAttendees.email, member.email)
        )
      )
      .limit(1);

    return NextResponse.json({
      rsvpStatus: attendee?.rsvpStatus || null,
    });
  } catch (error) {
    console.error('Failed to fetch RSVP status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RSVP status' },
      { status: 500 }
    );
  }
}
