import { siteConfig } from "@/site.config";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { meetingPrepItems, meetingPrepCompletions, members } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';

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

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const member = await getMember(userId);
    const today = new Date().toISOString().split('T')[0];

    const items = await db
      .select()
      .from(meetingPrepItems)
      .where(
        and(
          eq(meetingPrepItems.isArchived, false),
          gte(meetingPrepItems.dueDate, today)
        )
      )
      .orderBy(meetingPrepItems.sortOrder, meetingPrepItems.dueDate);

    let completions: { itemId: string; completedAt: Date }[] = [];
    if (member) {
      const memberCompletions = await db
        .select({
          itemId: meetingPrepCompletions.itemId,
          completedAt: meetingPrepCompletions.completedAt,
        })
        .from(meetingPrepCompletions)
        .where(eq(meetingPrepCompletions.memberId, member.id));
      completions = memberCompletions;
    }

    const completionMap = new Map(
      completions.map((c) => [c.itemId, c.completedAt])
    );

    const itemsWithCompletions = items.map((item) => ({
      ...item,
      completed: completionMap.has(item.id),
      completedAt: completionMap.get(item.id) || null,
    }));

    return NextResponse.json({ items: itemsWithCompletions });
  } catch (error) {
    console.error('Failed to fetch meeting prep items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting prep items' },
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

    const admin = await isAdmin(userId);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { title, href, note, sortOrder, dueDate } = body;

    if (!title || !dueDate) {
      return NextResponse.json(
        { error: 'Title and dueDate are required' },
        { status: 400 }
      );
    }

    const [result] = await db
      .insert(meetingPrepItems)
      .values({
        title,
        href: href || null,
        note: note || null,
        sortOrder: sortOrder ?? 0,
        dueDate,
      })
      .returning();

    return NextResponse.json({
      message: 'Item created successfully',
      item: result,
    });
  } catch (error) {
    console.error('Failed to create meeting prep item:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting prep item' },
      { status: 500 }
    );
  }
}
