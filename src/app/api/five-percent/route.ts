import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { fivePercentReflections, members, parkingLot, parkingLotCategories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      return NextResponse.json({ reflections: [], memberName: "" });
    }

    const reflections = await db
      .select()
      .from(fivePercentReflections)
      .where(eq(fivePercentReflections.memberId, member[0].id))
      .orderBy(desc(fivePercentReflections.createdAt));

    return NextResponse.json({
      reflections,
      memberName: member[0].name || `${member[0].firstName} ${member[0].lastName}`,
    });
  } catch (error) {
    console.error("Failed to fetch reflections:", error);
    return NextResponse.json(
      { error: "Failed to fetch reflections" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const body = await request.json();
    const {
      id,
      workFeelings,
      workCauses,
      workSignificance,
      familyFeelings,
      familyCauses,
      familySignificance,
      personalFeelings,
      personalCauses,
      personalSignificance,
      future30to60,
      whyTopics,
      whatHowTopics,
      convertWhyTopic,
      complete,
    } = body;

    let result;
    const now = new Date();

    if (id) {
      const existing = await db
        .select()
        .from(fivePercentReflections)
        .where(eq(fivePercentReflections.id, id))
        .limit(1);

      if (existing.length === 0 || existing[0].memberId !== member[0].id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      result = await db
        .update(fivePercentReflections)
        .set({
          workFeelings,
          workCauses,
          workSignificance,
          familyFeelings,
          familyCauses,
          familySignificance,
          personalFeelings,
          personalCauses,
          personalSignificance,
          future30to60,
          whyTopics,
          whatHowTopics,
          completedAt: complete ? now : existing[0].completedAt,
          updatedAt: now,
        })
        .where(eq(fivePercentReflections.id, id))
        .returning();
    } else {
      result = await db
        .insert(fivePercentReflections)
        .values({
          memberId: member[0].id,
          workFeelings,
          workCauses,
          workSignificance,
          familyFeelings,
          familyCauses,
          familySignificance,
          personalFeelings,
          personalCauses,
          personalSignificance,
          future30to60,
          whyTopics,
          whatHowTopics,
          completedAt: complete ? now : null,
        })
        .returning();
    }

    if (convertWhyTopic && whyTopics) {
      const whyCategory = await db
        .select()
        .from(parkingLotCategories)
        .where(eq(parkingLotCategories.name, "Important"))
        .limit(1);

      if (whyCategory.length > 0) {
        await db.insert(parkingLot).values({
          memberId: member[0].id,
          categoryId: whyCategory[0].id,
          date: now.toISOString().split("T")[0],
          noteText: whyTopics,
        });
      }
    }

    return NextResponse.json({
      message: "Reflection saved successfully",
      reflection: result[0],
    });
  } catch (error) {
    console.error("Failed to save reflection:", error);
    return NextResponse.json(
      { error: "Failed to save reflection" },
      { status: 500 }
    );
  }
}
