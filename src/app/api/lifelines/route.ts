import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { lifelines, members } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allLifelines = await db
      .select({
        id: lifelines.id,
        memberId: lifelines.memberId,
        fileName: lifelines.fileName,
        fileUrl: lifelines.fileUrl,
        fileType: lifelines.fileType,
        fileSize: lifelines.fileSize,
        createdAt: lifelines.createdAt,
        updatedAt: lifelines.updatedAt,
        memberName: members.name,
      })
      .from(lifelines)
      .leftJoin(members, eq(lifelines.memberId, members.id));

    return NextResponse.json(allLifelines);
  } catch (error) {
    console.error('Failed to fetch lifelines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lifelines' },
      { status: 500 }
    );
  }
}
