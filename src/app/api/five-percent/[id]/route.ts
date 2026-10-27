import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { fivePercentReflections, members } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    let member = await db
      .select()
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    if (member.length === 0 && userEmail) {
      member = await db
        .select()
        .from(members)
        .where(eq(members.email, userEmail))
        .limit(1);
    }

    if (member.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const reflection = await db
      .select()
      .from(fivePercentReflections)
      .where(eq(fivePercentReflections.id, id))
      .limit(1);

    if (reflection.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (reflection[0].memberId !== member[0].id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ reflection: reflection[0] });
  } catch (error) {
    console.error("Failed to fetch reflection:", error);
    return NextResponse.json(
      { error: "Failed to fetch reflection" },
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    let member = await db
      .select()
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    if (member.length === 0 && userEmail) {
      member = await db
        .select()
        .from(members)
        .where(eq(members.email, userEmail))
        .limit(1);
    }

    if (member.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const reflection = await db
      .select()
      .from(fivePercentReflections)
      .where(eq(fivePercentReflections.id, id))
      .limit(1);

    if (reflection.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (reflection[0].memberId !== member[0].id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db
      .delete(fivePercentReflections)
      .where(eq(fivePercentReflections.id, id));

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Failed to delete reflection:", error);
    return NextResponse.json(
      { error: "Failed to delete reflection" },
      { status: 500 }
    );
  }
}
