import { siteConfig, allowedMemberEmails } from "@/site.config";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { calendarEvents, eventAttendees, members, memberAllowlist } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

const FORUM_MEMBER_EMAILS = allowedMemberEmails();

function generateICS(event: {
  title: string;
  description: string | null;
  eventDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
}, attendeeEmails: string[]): string {
  const uid = `${event.eventDate}-${event.title.replace(/\s+/g, '-').toLowerCase()}@${siteConfig.domain}`;
  
  const formatDate = (dateStr: string, timeStr: string | null): string => {
    const date = new Date(dateStr + 'T12:00:00');
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':');
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const isAllDay = !event.startTime && !event.endTime;
  const startDate = isAllDay 
    ? event.eventDate.replace(/-/g, '')
    : formatDate(event.eventDate, event.startTime);
  
  let endDateStr: string;
  if (isAllDay) {
    const end = event.endDate || event.eventDate;
    const endDateObj = new Date(end + 'T12:00:00');
    endDateObj.setDate(endDateObj.getDate() + 1);
    endDateStr = endDateObj.toISOString().split('T')[0].replace(/-/g, '');
  } else {
    endDateStr = formatDate(event.endDate || event.eventDate, event.endTime || event.startTime);
  }

  const attendeesStr = attendeeEmails
    .map(email => `ATTENDEE;RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${email}`)
    .join('\r\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${siteConfig.forumName}//Events//EN`,
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    isAllDay ? `DTSTART;VALUE=DATE:${startDate}` : `DTSTART;TZID=America/New_York:${startDate}`,
    isAllDay ? `DTEND;VALUE=DATE:${endDateStr}` : `DTEND;TZID=America/New_York:${endDateStr}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
    event.location ? `LOCATION:${event.location}` : '',
    attendeesStr,
    `ORGANIZER;CN=${siteConfig.forumName}:mailto:${siteConfig.adminEmail}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  return ics;
}

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

    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const allMembers = await db
      .select({ 
        id: members.id, 
        email: members.email,
        name: members.name,
      })
      .from(members)
      .where(inArray(members.email, FORUM_MEMBER_EMAILS));

    const memberMap = new Map(allMembers.map(m => [m.email!, m]));

    const attendeeRecords = [];
    for (const email of FORUM_MEMBER_EMAILS) {
      const member = memberMap.get(email);
      
      const existing = await db
        .select()
        .from(eventAttendees)
        .where(
          and(
            eq(eventAttendees.eventId, id),
            eq(eventAttendees.email, email)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const [attendee] = await db
          .insert(eventAttendees)
          .values({
            eventId: id,
            memberId: member?.id ?? null,
            email,
            rsvpStatus: 'pending',
            inviteSentAt: new Date(),
          })
          .returning();
        attendeeRecords.push(attendee);
      } else {
        await db
          .update(eventAttendees)
          .set({
            inviteSentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(eventAttendees.id, existing[0].id));
        attendeeRecords.push(existing[0]);
      }
    }

    const icsContent = generateICS(event, FORUM_MEMBER_EMAILS);

    return NextResponse.json({
      message: `Invites prepared for ${FORUM_MEMBER_EMAILS.length} members`,
      event: {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
      },
      invitees: FORUM_MEMBER_EMAILS,
      attendees: attendeeRecords.length,
      icsContent,
      instructions: {
        manual: 'Download the ICS file and send via email, or use Google Calendar API with service account',
        googleCalendar: 'To enable automatic Google Calendar invites, set GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_CALENDAR_ID env vars',
      },
    });
  } catch (error) {
    console.error('Failed to send invites:', error);
    return NextResponse.json(
      { error: 'Failed to send invites' },
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

    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const attendees = await db
      .select({
        id: eventAttendees.id,
        email: eventAttendees.email,
        rsvpStatus: eventAttendees.rsvpStatus,
        inviteSentAt: eventAttendees.inviteSentAt,
        respondedAt: eventAttendees.respondedAt,
        memberName: members.name,
      })
      .from(eventAttendees)
      .leftJoin(members, eq(eventAttendees.memberId, members.id))
      .where(eq(eventAttendees.eventId, id));

    const summary = {
      total: attendees.length,
      attending: attendees.filter(a => a.rsvpStatus === 'accepted').length,
      notAttending: attendees.filter(a => a.rsvpStatus === 'declined').length,
      pending: attendees.filter(a => a.rsvpStatus === 'pending').length,
    };

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
      },
      attendees,
      summary,
    });
  } catch (error) {
    console.error('Failed to fetch attendees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendees' },
      { status: 500 }
    );
  }
}
