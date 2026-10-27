import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { goals, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { INITIAL_MEMBERS } from "@/lib/members-data";
import { normalizeGoal, SEEDED_GOALS } from "@/lib/goals-data";

function memberDisplayName(row: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
  return row.name?.trim() || fullName || row.email || "Member";
}

async function ensureSeededGoals() {
  const existing = await db.select({ id: goals.id }).from(goals).limit(1);
  if (existing.length > 0) {
    return;
  }

  const allMembers = await db
    .select({
      id: members.id,
      email: members.email,
    })
    .from(members);

  const memberIdByEmail = new Map<string, string>();
  for (const member of allMembers) {
    if (member.email) {
      memberIdByEmail.set(member.email.toLowerCase(), member.id);
    }
  }

  const rows = SEEDED_GOALS.flatMap((goal) => {
    const seedMember = INITIAL_MEMBERS.find((member) => member.id === goal.memberId);
    const memberId = seedMember?.email
      ? memberIdByEmail.get(seedMember.email.toLowerCase())
      : undefined;
    if (!memberId) {
      return [];
    }
    return [
      {
        memberId,
        goalText: goal.goalText,
        horizon: goal.horizon,
        setDate: goal.setDate,
        targetDate: goal.targetDate,
        result: goal.result,
      },
    ];
  });

  if (rows.length > 0) {
    await db.insert(goals).values(rows);
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSeededGoals();

    const user = await currentUser();
    const emails = (user?.emailAddresses ?? []).map((email) =>
      email.emailAddress.toLowerCase()
    );

    const allMembers = await db
      .select({
        id: members.id,
        name: members.name,
        firstName: members.firstName,
        lastName: members.lastName,
        email: members.email,
        clerkUserId: members.clerkUserId,
      })
      .from(members);

    const current =
      allMembers.find((member) => member.clerkUserId === userId) ??
      allMembers.find((member) => member.email && emails.includes(member.email.toLowerCase()));

    const allGoals = await db
      .select({
        id: goals.id,
        memberId: goals.memberId,
        goalText: goals.goalText,
        horizon: goals.horizon,
        setDate: goals.setDate,
        targetDate: goals.targetDate,
        result: goals.result,
        memberName: members.name,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
        memberEmail: members.email,
      })
      .from(goals)
      .leftJoin(members, eq(goals.memberId, members.id))
      .orderBy(goals.targetDate);

    return NextResponse.json({
      goals: allGoals.map((goal) =>
        normalizeGoal({
          id: goal.id,
          memberId: goal.memberId,
          goalText: goal.goalText,
          horizon: goal.horizon,
          setDate: goal.setDate,
          targetDate: goal.targetDate,
          result: goal.result,
          memberName: memberDisplayName({
            name: goal.memberName,
            firstName: goal.memberFirstName,
            lastName: goal.memberLastName,
            email: goal.memberEmail,
          }),
          memberEmail: goal.memberEmail,
        })
      ),
      currentMember: current
        ? {
            id: current.id,
            name: memberDisplayName(current),
            email: current.email,
          }
        : null,
      members: allMembers.map((member) => ({
        id: member.id,
        name: memberDisplayName(member),
        email: member.email,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals" },
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

    const body = await request.json();
    const { goalText, horizon, setDate, targetDate, memberId: requestedMemberId } = body;

    if (!goalText || !horizon || !setDate || !targetDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let targetMemberId: string;

    if (requestedMemberId) {
      const targetMember = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.id, requestedMemberId))
        .limit(1);

      if (targetMember.length === 0) {
        return NextResponse.json({ error: "Target member not found" }, { status: 404 });
      }
      targetMemberId = targetMember[0].id;
    } else {
      const currentMember = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.clerkUserId, userId))
        .limit(1);

      if (currentMember.length === 0) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      targetMemberId = currentMember[0].id;
    }

    const result = await db
      .insert(goals)
      .values({
        memberId: targetMemberId,
        goalText,
        horizon,
        setDate,
        targetDate,
        result: "open",
      })
      .returning();

    return NextResponse.json({
      message: "Goal created successfully",
      goal: result[0],
    });
  } catch (error) {
    console.error("Failed to create goal:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}
