import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { parkingLot } from '@/db/schema';
import { eq } from 'drizzle-orm';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
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
      message: 'Topic deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete deep dive topic:', error);
    return NextResponse.json(
      { error: 'Failed to delete deep dive topic' },
      { status: 500 }
    );
  }
}
