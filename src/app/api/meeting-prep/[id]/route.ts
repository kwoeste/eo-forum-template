import { siteConfig } from "@/site.config";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { meetingPrepItems, meetingPrepCompletions, members } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const ADMIN_EMAIL = siteConfig.adminEmail;

async function getMember(userId: string) {
  const member = await db
    .select()
    .from(members)
    .where(eq(members.clerkUserId, userId))
    .limit(1);
  return member[0] || null;
}

async function isAdmin(userId: string): Promise<boolean> {
  const member = await getMember(userId);
  return member?.email === ADMIN_EMAIL || member?.isAdmin === true;
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
    const body = await request.json();
    const { action, title, href, note, sortOrder, dueDate, isArchived } = body;

    if (action === 'complete' || action === 'uncomplete') {
      const member = await getMember(userId);
      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      const existing = await db
        .select()
        .from(meetingPrepCompletions)
        .where(
          and(
            eq(meetingPrepCompletions.itemId, id),
            eq(meetingPrepCompletions.memberId, member.id)
          )
        )
        .limit(1);

      if (action === 'complete') {
        if (existing.length === 0) {
          await db.insert(meetingPrepCompletions).values({
            itemId: id,
            memberId: member.id,
          });
        }
        return NextResponse.json({ message: 'Marked as complete' });
      } else {
        if (existing.length > 0) {
          await db
            .delete(meetingPrepCompletions)
            .where(
              and(
                eq(meetingPrepCompletions.itemId, id),
                eq(meetingPrepCompletions.memberId, member.id)
              )
            );
        }
        return NextResponse.json({ message: 'Marked as incomplete' });
      }
    }

    const admin = await isAdmin(userId);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const updates: Partial<{
      title: string;
      href: string | null;
      note: string | null;
      sortOrder: number;
      dueDate: string;
      isArchived: boolean;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (title !== undefined) updates.title = title;
    if (href !== undefined) updates.href = href;
    if (note !== undefined) updates.note = note;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (isArchived !== undefined) updates.isArchived = isArchived;

    const [result] = await db
      .update(meetingPrepItems)
      .set(updates)
      .where(eq(meetingPrepItems.id, id))
      .returning();

    return NextResponse.json({
      message: 'Item updated successfully',
      item: result,
    });
  } catch (error) {
    console.error('Failed to update meeting prep item:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting prep item' },
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

    const admin = await isAdmin(userId);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    await db
      .delete(meetingPrepCompletions)
      .where(eq(meetingPrepCompletions.itemId, id));

    await db.delete(meetingPrepItems).where(eq(meetingPrepItems.id, id));

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Failed to delete meeting prep item:', error);
    return NextResponse.json(
      { error: 'Failed to delete meeting prep item' },
      { status: 500 }
    );
  }
}
