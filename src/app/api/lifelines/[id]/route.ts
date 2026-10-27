import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { lifelines, members } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const lifeline = await db
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
      .leftJoin(members, eq(lifelines.memberId, members.id))
      .where(eq(lifelines.id, id))
      .limit(1);

    if (lifeline.length === 0) {
      return NextResponse.json({ error: 'Lifeline not found' }, { status: 404 });
    }

    return NextResponse.json(lifeline[0]);
  } catch (error) {
    console.error('Failed to fetch lifeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lifeline' },
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

    const user = await db
      .select()
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    const isAdmin = user.length > 0 && user[0].isAdmin;

    const { id } = await params;
    const lifeline = await db
      .select()
      .from(lifelines)
      .where(eq(lifelines.id, id))
      .limit(1);

    if (lifeline.length === 0) {
      return NextResponse.json({ error: 'Lifeline not found' }, { status: 404 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (lifeline[0].fileUrl) {
      const filePath = path.join(process.cwd(), 'public', lifeline[0].fileUrl);
      try {
        await unlink(filePath);
      } catch {
        console.warn('File not found or already deleted:', filePath);
      }
    }

    await db.delete(lifelines).where(eq(lifelines.id, id));

    return NextResponse.json({ message: 'Lifeline deleted successfully' });
  } catch (error) {
    console.error('Failed to delete lifeline:', error);
    return NextResponse.json(
      { error: 'Failed to delete lifeline' },
      { status: 500 }
    );
  }
}
