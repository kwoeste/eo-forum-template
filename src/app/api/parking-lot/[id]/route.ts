import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { parkingLot, parkingLotCategories, members } from '@/db/schema';
import { eq } from 'drizzle-orm';

const PARKING_LOT_STATUSES = [
  'active',
  'archived',
  'converted-deep-dive',
  'converted-round-table',
  'completed-round-table',
  'archived-round-table',
] as const;
type ParkingLotStatus = (typeof PARKING_LOT_STATUSES)[number];

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isParkingLotStatus(value: unknown): value is ParkingLotStatus {
  return (
    typeof value === 'string' &&
    (PARKING_LOT_STATUSES as readonly string[]).includes(value)
  );
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, noteText, date, memberId, categoryId, isHighlighted } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (status !== undefined) {
      if (!isParkingLotStatus(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (noteText !== undefined) {
      if (typeof noteText !== 'string' || !noteText.trim()) {
        return NextResponse.json(
          { error: 'Note text cannot be empty' },
          { status: 400 }
        );
      }
      updateData.noteText = noteText.trim();
    }

    if (date !== undefined) {
      const parsedDate = date ? parseDate(date) : null;
      updateData.date = parsedDate;
    }

    if (memberId !== undefined || body.memberName !== undefined) {
      if (memberId === null || memberId === '' || body.memberName === null || body.memberName === '') {
        updateData.memberId = null;
      } else if (memberId && isUuid(memberId)) {
        const memberExists = await db
          .select({ id: members.id })
          .from(members)
          .where(eq(members.id, memberId))
          .limit(1);
        if (memberExists.length === 0) {
          return NextResponse.json(
            { error: 'Invalid member ID' },
            { status: 400 }
          );
        }
        updateData.memberId = memberId;
      } else if (body.memberName) {
        const allMembers = await db
          .select()
          .from(members)
          .limit(100);
        const matchedMember = allMembers.find(
          (m) =>
            m.name?.toLowerCase() === body.memberName?.toLowerCase() ||
            m.firstName?.toLowerCase() === body.memberName?.split(' ')[0]?.toLowerCase()
        );
        if (matchedMember) {
          updateData.memberId = matchedMember.id;
        } else {
          updateData.memberId = null;
        }
      }
    }

    if (categoryId !== undefined) {
      if (!isUuid(categoryId)) {
        return NextResponse.json(
          { error: 'Invalid category ID format' },
          { status: 400 }
        );
      }
      const categoryExists = await db
        .select({ id: parkingLotCategories.id })
        .from(parkingLotCategories)
        .where(eq(parkingLotCategories.id, categoryId))
        .limit(1);
      if (categoryExists.length === 0) {
        return NextResponse.json(
          { error: 'Invalid category ID' },
          { status: 400 }
        );
      }
      updateData.categoryId = categoryId;
    }

    if (isHighlighted !== undefined) {
      if (typeof isHighlighted !== 'boolean') {
        return NextResponse.json(
          { error: 'Invalid isHighlighted value' },
          { status: 400 }
        );
      }
      updateData.isHighlighted = isHighlighted;
    }

    const updated = await db
      .update(parkingLot)
      .set(updateData)
      .where(eq(parkingLot.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Item updated successfully',
      item: updated[0],
    });
  } catch (error) {
    console.error('Failed to update parking lot item:', error);
    return NextResponse.json(
      { error: 'Failed to update parking lot item' },
      { status: 500 }
    );
  }
}
