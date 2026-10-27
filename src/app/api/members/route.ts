import { NextResponse } from 'next/server';
import { getForumMembers } from '@/lib/members-query';

export async function GET() {
  try {
    const allMembers = await getForumMembers();
    return NextResponse.json(allMembers);
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
