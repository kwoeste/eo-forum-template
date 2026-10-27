import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { calendarEvents } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

interface SeedEvent {
  title: string;
  description?: string | null;
  eventDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  eventType: string;
}

// Optional starter events for your forum. Edit, then POST /api/events/seed once.
const SEED_EVENTS: SeedEvent[] = [
  {
    title: "Forum",
    eventDate: "2027-01-14",
    startTime: "12:00",
    endTime: "16:30",
    location: null,
    eventType: "forum",
  },
];

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'upsert';

    const results = {
      inserted: [] as SeedEvent[],
      updated: [] as SeedEvent[],
      skipped: [] as SeedEvent[],
    };

    for (const event of SEED_EVENTS) {
      const existing = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.title, event.title),
            eq(calendarEvents.eventDate, event.eventDate)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        if (mode === 'upsert') {
          await db
            .update(calendarEvents)
            .set({
              description: event.description || null,
              endDate: event.endDate || null,
              startTime: event.startTime || null,
              endTime: event.endTime || null,
              location: event.location || null,
              eventType: event.eventType,
              updatedAt: new Date(),
            })
            .where(eq(calendarEvents.id, existing[0].id));
          results.updated.push(event);
        } else {
          results.skipped.push(event);
        }
      } else {
        await db
          .insert(calendarEvents)
          .values({
            title: event.title,
            description: event.description || null,
            eventDate: event.eventDate,
            endDate: event.endDate || null,
            startTime: event.startTime || null,
            endTime: event.endTime || null,
            location: event.location || null,
            eventType: event.eventType,
          });
        results.inserted.push(event);
      }
    }

    return NextResponse.json({
      message: `Seed complete: ${results.inserted.length} inserted, ${results.updated.length} updated, ${results.skipped.length} skipped`,
      results,
    });
  } catch (error) {
    console.error('Failed to seed events:', error);
    return NextResponse.json(
      { error: 'Failed to seed events' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    description: 'POST to this endpoint to seed/restore the starter events',
    mode_options: {
      upsert: 'Insert new events, update existing by title+date (default)',
      insert_only: 'Only insert new events, skip existing',
    },
    usage: 'POST /api/events/seed?mode=upsert',
    events_to_seed: SEED_EVENTS.map(e => ({
      title: e.title,
      date: e.eventDate,
      type: e.eventType,
    })),
  });
}
