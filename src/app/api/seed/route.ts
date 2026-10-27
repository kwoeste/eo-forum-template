import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { members, meetingPrepItems } from '@/db/schema';
import { siteConfig } from "@/site.config";
import { eq } from 'drizzle-orm';

const SEED_SECRET = process.env.SEED_SECRET;

const ADMIN_MEMBER = {
  name: "Site Admin",
  email: siteConfig.adminEmail,
  role: "Admin",
  isAdmin: true,
};

const MEETING_PREP_SEED = [
  {
    title: "Complete this meeting's 5%",
    href: '/five-percent',
    note: null,
    sortOrder: 1,
    dueDate: new Date().toISOString().slice(0, 10),
  },
  {
    title: 'Archetype',
    href: '/profile',
    note: 'Review your archetype before the meeting',
    sortOrder: 2,
    dueDate: new Date().toISOString().slice(0, 10),
  },
];

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  if (!SEED_SECRET) {
    return NextResponse.json(
      { error: 'SEED_SECRET not configured' },
      { status: 500 }
    );
  }

  if (providedSecret !== SEED_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const results: { admin?: unknown; meetingPrepItems?: unknown[] } = {};

    const existingAdmin = await db
      .select()
      .from(members)
      .where(eq(members.email, ADMIN_MEMBER.email))
      .limit(1);

    if (existingAdmin.length > 0) {
      results.admin = { message: 'Admin already exists', member: existingAdmin[0] };
    } else {
      const [newMember] = await db
        .insert(members)
        .values(ADMIN_MEMBER)
        .returning();
      results.admin = { message: 'Admin seeded successfully', member: newMember };
    }

    const existingPrepItems = await db.select().from(meetingPrepItems);
    if (existingPrepItems.length === 0) {
      const seededItems = [];
      for (const item of MEETING_PREP_SEED) {
        const [result] = await db.insert(meetingPrepItems).values(item).returning();
        seededItems.push(result);
      }
      results.meetingPrepItems = seededItems;
    } else {
      results.meetingPrepItems = existingPrepItems;
    }

    return NextResponse.json({
      message: 'Seed completed',
      results,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    );
  }
}
