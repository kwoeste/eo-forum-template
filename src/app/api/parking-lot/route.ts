import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { parkingLot, parkingLotCategories, members } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

const DEFAULT_CATEGORIES = [
  { name: 'Important Urgent', sortOrder: 1 },
  { name: 'Important', sortOrder: 2 },
  { name: 'Not Urgent', sortOrder: 3 },
  { name: 'Not Important Not Urgent', sortOrder: 4 },
  { name: 'Wisdom', sortOrder: 5 },
];

const MONTH_NAMES: Record<string, number> = {
  'jan': 0, 'january': 0,
  'feb': 1, 'february': 1,
  'mar': 2, 'march': 2,
  'apr': 3, 'april': 3,
  'may': 4,
  'jun': 5, 'june': 5,
  'jul': 6, 'july': 6,
  'aug': 7, 'august': 7,
  'sep': 8, 'sept': 8, 'september': 8,
  'oct': 9, 'october': 9,
  'nov': 10, 'november': 10,
  'dec': 11, 'december': 11,
};

function parseDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }
  
  const trimmed = dateStr.trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  const dayMonthMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]+)$/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthKey = dayMonthMatch[2].toLowerCase();
    const monthIndex = MONTH_NAMES[monthKey];
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      const year = 2025;
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  const monthDayMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?$/i);
  if (monthDayMatch) {
    const monthKey = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    const yearStr = monthDayMatch[3];
    const monthIndex = MONTH_NAMES[monthKey];
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      const year = yearStr ? parseInt(yearStr, 10) : 2026;
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  return null;
}

function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function ensureCategories() {
  const existingCategories = await db
    .select()
    .from(parkingLotCategories)
    .where(eq(parkingLotCategories.isArchived, false));

  if (existingCategories.length === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.insert(parkingLotCategories).values(cat);
    }
    return db
      .select()
      .from(parkingLotCategories)
      .where(eq(parkingLotCategories.isArchived, false))
      .orderBy(parkingLotCategories.sortOrder);
  }

  return existingCategories;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await ensureCategories();

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
      })
      .from(parkingLot)
      .leftJoin(members, eq(parkingLot.memberId, members.id))
      .leftJoin(parkingLotCategories, eq(parkingLot.categoryId, parkingLotCategories.id))
      .orderBy(desc(parkingLot.createdAt));

    return NextResponse.json({ items, categories });
  } catch (error) {
    console.error('Failed to fetch parking lot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parking lot' },
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

    const body = await request.json();

    await ensureCategories();

    if (Array.isArray(body.items)) {
      const created: Array<{ id: string; noteText: string }> = [];
      const skipped: Array<{ index: number; reason: string; noteText?: string }> = [];
      const errors: Array<{ index: number; error: string; noteText?: string }> = [];

      if (body.replaceAll === true) {
        await db.delete(parkingLot);
      }

      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        try {
          const result = await createItem(item);
          if (result) {
            created.push({ id: result.id, noteText: result.noteText });
          } else {
            skipped.push({ index: i, reason: 'No valid category', noteText: item.noteText });
          }
        } catch (itemError) {
          const errorMessage = itemError instanceof Error ? itemError.message : 'Unknown error';
          console.error(`Failed to create parking lot item at index ${i}:`, errorMessage);
          errors.push({ index: i, error: errorMessage, noteText: item.noteText });
        }
      }

      const hasCreated = created.length > 0;
      if (!hasCreated && errors.length > 0) {
        return NextResponse.json({
          error: 'Failed to create any parking lot items',
          created,
          skipped,
          errors,
        }, { status: 500 });
      }

      return NextResponse.json({
        message: `Created ${created.length} item(s), skipped ${skipped.length}, failed ${errors.length}`,
        items: created,
        created,
        skipped,
        errors,
      });
    } else {
      const result = await createItem(body);
      if (!result) {
        return NextResponse.json({
          error: 'Failed to create item: no valid category',
        }, { status: 400 });
      }
      return NextResponse.json({
        message: 'Item created successfully',
        item: result,
        created: [{ id: result.id, noteText: result.noteText }],
        skipped: [],
        errors: [],
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create parking lot item:', errorMessage, error);
    return NextResponse.json(
      { error: 'Failed to create parking lot item', details: errorMessage },
      { status: 500 }
    );
  }
}

async function createItem(item: {
  memberId?: string | null;
  memberName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  date: string;
  noteText: string;
  isHighlighted?: boolean;
  status?: string;
}) {
  let categoryId = item.categoryId;

  if (categoryId && !isValidUUID(categoryId)) {
    categoryId = null;
  }

  if (!categoryId && item.categoryName) {
    const category = await db
      .select()
      .from(parkingLotCategories)
      .where(eq(parkingLotCategories.name, item.categoryName))
      .limit(1);

    if (category.length > 0) {
      categoryId = category[0].id;
    }
  }

  if (!categoryId) {
    console.error('No valid category for item:', item.noteText);
    return null;
  }

  let memberId: string | null = null;

  if (item.memberId && isValidUUID(item.memberId)) {
    memberId = item.memberId;
  } else if (item.memberName) {
    const allMembers = await db
      .select()
      .from(members)
      .limit(100);
    
    const matchedMember = allMembers.find(
      (m) =>
        m.name?.toLowerCase() === item.memberName?.toLowerCase() ||
        m.firstName?.toLowerCase() === item.memberName?.split(' ')[0]?.toLowerCase()
    );

    if (matchedMember) {
      memberId = matchedMember.id;
    }
  }

  const parsedDate = parseDate(item.date);

  const [result] = await db
    .insert(parkingLot)
    .values({
      memberId: memberId,
      categoryId,
      date: parsedDate,
      noteText: item.noteText,
      isHighlighted: item.isHighlighted ?? false,
      status: item.status ?? 'active',
    })
    .returning();

  return result;
}
