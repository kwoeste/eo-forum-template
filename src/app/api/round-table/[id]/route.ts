import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { parkingLot } from '@/db/schema';
import { eq } from 'drizzle-orm';

const ROUND_TABLE_STATUSES = [
  'converted-round-table',
  'completed-round-table',
  'archived-round-table',
] as const;

type RoundTableStatus = (typeof ROUND_TABLE_STATUSES)[number];

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isRoundTableStatus(value: unknown): value is RoundTableStatus {
  return (
    typeof value === 'string' &&
    (ROUND_TABLE_STATUSES as readonly string[]).includes(value)
  );
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
    const { status } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (status !== undefined) {
      if (!isRoundTableStatus(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
      updateData.status = status;
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
    console.error('Failed to update round table item:', error);
    return NextResponse.json(
      { error: 'Failed to update round table item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const deleted = await db
      .delete(parkingLot)
      .where(eq(parkingLot.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Item deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete round table item:', error);
    return NextResponse.json(
      { error: 'Failed to delete round table item' },
      { status: 500 }
    );
  }
}
