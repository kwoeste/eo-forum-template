import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { deepDivePacks, members } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allDives = await db
      .select()
      .from(deepDivePacks)
      .orderBy(deepDivePacks.createdAt);

    return NextResponse.json({ dives: allDives });
  } catch (error) {
    console.error('Failed to fetch deep dives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deep dives' },
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
    const {
      coachId,
      presenterId,
      coachingDate,
      coachingTime,
      coachingLocation,
      meetingId,
      coachingStatus,
    } = body;

    if (!coachId || !presenterId) {
      return NextResponse.json(
        { error: 'Coach and presenter are required' },
        { status: 400 }
      );
    }

    if (coachId === presenterId) {
      return NextResponse.json(
        { error: 'Coach and presenter must be different people' },
        { status: 400 }
      );
    }

    const result = await db
      .insert(deepDivePacks)
      .values({
        coachId,
        presenterId,
        coachingDate: coachingDate || null,
        coachingTime: coachingTime || null,
        coachingLocation: coachingLocation || null,
        meetingId: meetingId || null,
        coachingStatus: coachingStatus || 'scheduled',
      })
      .returning();

    return NextResponse.json({
      message: 'Deep Dive planned successfully',
      dive: result[0],
    });
  } catch (error) {
    console.error('Failed to create deep dive:', error);
    return NextResponse.json(
      { error: 'Failed to create deep dive' },
      { status: 500 }
    );
  }
}
