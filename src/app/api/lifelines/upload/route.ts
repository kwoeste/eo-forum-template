import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { lifelines, members } from '@/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { saveUploadedBrowserFile } from '@/lib/storage';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const memberId = formData.get('memberId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF or image file.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const member = await db
      .select()
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);

    if (member.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const existingLifeline = await db
      .select()
      .from(lifelines)
      .where(eq(lifelines.memberId, memberId))
      .limit(1);

    const ext = path.extname(file.name);
    const uniqueFileName = `${uuidv4()}${ext}`;
    const saved = await saveUploadedBrowserFile(file, 'lifelines', uniqueFileName);
    const fileUrl = saved.url;

    let result;
    if (existingLifeline.length > 0) {
      result = await db
        .update(lifelines)
        .set({
          fileName: file.name,
          fileUrl,
          fileType: file.type,
          fileSize: file.size,
          updatedAt: new Date(),
        })
        .where(eq(lifelines.memberId, memberId))
        .returning();
    } else {
      result = await db
        .insert(lifelines)
        .values({
          memberId,
          fileName: file.name,
          fileUrl,
          fileType: file.type,
          fileSize: file.size,
        })
        .returning();
    }

    return NextResponse.json({
      message: 'Lifeline uploaded successfully',
      lifeline: result[0],
    });
  } catch (error) {
    console.error('Failed to upload lifeline:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload lifeline';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
