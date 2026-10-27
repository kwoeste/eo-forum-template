import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { calendarEvents, members, eventAttendees } from '@/db/schema';
import { eq, gte, asc, and, sql } from 'drizzle-orm';

export type EventType = 'forum' | 'chapter' | 'social' | 'retreat' | 'general';

const selectFields = {
  id: calendarEvents.id,
  title: calendarEvents.title,
  description: calendarEvents.description,
  eventDate: calendarEvents.eventDate,
  endDate: calendarEvents.endDate,
  startTime: calendarEvents.startTime,
  endTime: calendarEvents.endTime,
  location: calendarEvents.location,
  eventType: calendarEvents.eventType,
  createdBy: calendarEvents.createdBy,
  createdAt: calendarEvents.createdAt,
};

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeAllUpcoming = searchParams.get('upcoming') === 'true';
    const eventType = searchParams.get('type') as EventType | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const nextOnly = searchParams.get('nextOnly') === 'true';

    const today = new Date().toISOString().split('T')[0];

    let results;

    if (includeAllUpcoming && eventType) {
      results = await db
        .select(selectFields)
        .from(calendarEvents)
        .where(and(
          gte(calendarEvents.eventDate, today),
          eq(calendarEvents.eventType, eventType)
        ))
        .orderBy(asc(calendarEvents.eventDate));
    } else if (includeAllUpcoming) {
      results = await db
        .select(selectFields)
        .from(calendarEvents)
        .where(gte(calendarEvents.eventDate, today))
        .orderBy(asc(calendarEvents.eventDate));
    } else if (eventType) {
      results = await db
        .select(selectFields)
        .from(calendarEvents)
        .where(eq(calendarEvents.eventType, eventType))
        .orderBy(asc(calendarEvents.eventDate));
    } else {
      results = await db
        .select(selectFields)
        .from(calendarEvents)
        .orderBy(asc(calendarEvents.eventDate));
    }

    if (nextOnly && results.length > 0) {
      return NextResponse.json({ event: results[0] });
    }

    if (limit && results.length > limit) {
      results = results.slice(0, limit);
    }

    const includeAttendance = searchParams.get('includeAttendance') === 'true';
    
    if (includeAttendance) {
      const eventsWithAttendance = await Promise.all(
        results.map(async (event) => {
          const attendees = await db
            .select({
              rsvpStatus: eventAttendees.rsvpStatus,
            })
            .from(eventAttendees)
            .where(eq(eventAttendees.eventId, event.id));

          return {
            ...event,
            attendance: {
              total: attendees.length,
              attending: attendees.filter(a => a.rsvpStatus === 'accepted').length,
              notAttending: attendees.filter(a => a.rsvpStatus === 'declined').length,
              pending: attendees.filter(a => a.rsvpStatus === 'pending').length,
            },
          };
        })
      );
      return NextResponse.json({ events: eventsWithAttendance });
    }

    return NextResponse.json({ events: results });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, eventDate, endDate, startTime, endTime, location, eventType } = body;

    if (!title || !eventDate) {
      return NextResponse.json(
        { error: 'Title and event date are required' },
        { status: 400 }
      );
    }

    const member = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    const memberId = member.length > 0 ? member[0].id : null;

    const validEventTypes = ['forum', 'chapter', 'social', 'retreat', 'general'];
    const sanitizedEventType = validEventTypes.includes(eventType) ? eventType : 'general';

    const [result] = await db
      .insert(calendarEvents)
      .values({
        title,
        description: description || null,
        eventDate,
        endDate: endDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        location: location || null,
        eventType: sanitizedEventType,
        createdBy: memberId,
      })
      .returning();

    return NextResponse.json({ event: result });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
