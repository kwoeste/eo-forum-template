import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { parkingLot, parkingLotCategories, members } from '@/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';

const ROUND_TABLE_STATUSES = [
  'converted-round-table',
  'completed-round-table',
  'archived-round-table',
] as const;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await db
      .select({
        id: parkingLot.id,
        memberId: parkingLot.memberId,
        memberName: members.name,
        categoryId: parkingLot.categoryId,
        categoryName: parkingLotCategories.name,
        date: parkingLot.date,
        noteText: parkingLot.noteText,
        isHighlighted: parkingLot.isHighlighted,
        status: parkingLot.status,
        createdAt: parkingLot.createdAt,
      })
      .from(parkingLot)
      .leftJoin(members, eq(parkingLot.memberId, members.id))
      .leftJoin(parkingLotCategories, eq(parkingLot.categoryId, parkingLotCategories.id))
      .where(inArray(parkingLot.status, [...ROUND_TABLE_STATUSES]))
      .orderBy(desc(parkingLot.createdAt));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Failed to fetch round table items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch round table items' },
      { status: 500 }
    );
  }
}

function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, memberName, date, noteText } = body;

    if (!noteText || typeof noteText !== 'string' || !noteText.trim()) {
      return NextResponse.json(
        { error: 'Note text is required' },
        { status: 400 }
      );
    }

    let resolvedMemberId: string | null = null;

    if (memberId && isValidUUID(memberId)) {
      resolvedMemberId = memberId;
    } else if (memberName) {
      const allMembers = await db.select().from(members).limit(100);
      const matchedMember = allMembers.find(
        (m) =>
          m.name?.toLowerCase() === memberName?.toLowerCase() ||
          m.firstName?.toLowerCase() === memberName?.split(' ')[0]?.toLowerCase()
      );
      if (matchedMember) {
        resolvedMemberId = matchedMember.id;
      }
    }

    const parsedDate = date ? parseDate(date) : null;

    const [result] = await db
      .insert(parkingLot)
      .values({
        memberId: resolvedMemberId,
        categoryId: null,
        date: parsedDate,
        noteText: noteText.trim(),
        isHighlighted: false,
        status: 'converted-round-table',
      })
      .returning();

    return NextResponse.json({
      message: 'Round table topic created successfully',
      item: result,
    });
  } catch (error) {
    console.error('Failed to create round table item:', error);
    return NextResponse.json(
      { error: 'Failed to create round table item' },
      { status: 500 }
    );
  }
}
