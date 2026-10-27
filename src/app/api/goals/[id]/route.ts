import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { goals, members } from '@/db/schema';
import { eq } from 'drizzle-orm';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function PUT(
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
    const { result, goalText, memberId } = body;

    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const updateData: {
      result?: string;
      goalText?: string;
      memberId?: string;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (result !== undefined) {
      if (!['open', 'hit', 'missed'].includes(result)) {
        return NextResponse.json(
          { error: 'Invalid result value' },
          { status: 400 }
        );
      }
      updateData.result = result;
    }

    if (goalText !== undefined) {
      if (typeof goalText !== 'string' || goalText.trim() === '') {
        return NextResponse.json(
          { error: 'Invalid goal text' },
          { status: 400 }
        );
      }
      updateData.goalText = goalText.trim();
    }

    if (memberId !== undefined) {
      if (!isUuid(memberId)) {
        return NextResponse.json(
          { error: 'Invalid member ID' },
          { status: 400 }
        );
      }
      const targetMember = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);

      if (targetMember.length === 0) {
        return NextResponse.json({ error: 'Target member not found' }, { status: 404 });
      }
      updateData.memberId = memberId;
    }

    const updated = await db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Goal updated successfully',
      goal: updated[0],
    });
  } catch (error) {
    console.error('Failed to update goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    );
  }
}
