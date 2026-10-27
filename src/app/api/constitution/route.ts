import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { constitutionSignatures } from "@/db/schema";
import { CONSTITUTION_VERSION } from "@/lib/constitution";
import {
  getForumMembers,
  getMemberForAuth,
  memberDisplayName,
} from "@/lib/members-query";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    const member = await getMemberForAuth(userId, userEmail);

    const signatures = await db
      .select()
      .from(constitutionSignatures)
      .where(eq(constitutionSignatures.constitutionVersion, CONSTITUTION_VERSION));

    const signatureByMember = new Map(
      signatures.map((signature) => [signature.memberId, signature])
    );

    const forumMembers = await getForumMembers();
    const members = forumMembers.map((forumMember) => {
      const signature = signatureByMember.get(forumMember.id);
      return {
        memberId: forumMember.id,
        name: forumMember.name,
        signed: Boolean(signature),
        signedName: signature?.signedName ?? null,
        signedAt: signature?.signedAt ?? null,
      };
    });

    const mySignature = member ? signatureByMember.get(member.id) ?? null : null;

    return NextResponse.json({
      version: CONSTITUTION_VERSION,
      memberName: member ? memberDisplayName(member) : "",
      signature: mySignature
        ? {
            signedName: mySignature.signedName,
            signedAt: mySignature.signedAt,
          }
        : null,
      members,
    });
  } catch (error) {
    console.error("Failed to fetch constitution signatures:", error);
    return NextResponse.json(
      { error: "Failed to fetch constitution signatures" },
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
    const member = await getMemberForAuth(userId, userEmail);

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const body = await request.json();
    const signedName = typeof body.signedName === "string" ? body.signedName.trim() : "";
    const agreed = body.agreed === true;

    if (!agreed) {
      return NextResponse.json(
        { error: "You must approve the Constitution before signing" },
        { status: 400 }
      );
    }

    if (signedName.length < 2) {
      return NextResponse.json(
        { error: "Type your full name to sign" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(constitutionSignatures)
      .where(
        and(
          eq(constitutionSignatures.memberId, member.id),
          eq(constitutionSignatures.constitutionVersion, CONSTITUTION_VERSION)
        )
      )
      .limit(1);

    if (existing[0]) {
      return NextResponse.json({
        message: "Already signed",
        signature: {
          signedName: existing[0].signedName,
          signedAt: existing[0].signedAt,
        },
      });
    }

    const [created] = await db
      .insert(constitutionSignatures)
      .values({
        memberId: member.id,
        constitutionVersion: CONSTITUTION_VERSION,
        signedName,
      })
      .returning();

    return NextResponse.json({
      message: "Constitution signed",
      signature: {
        signedName: created.signedName,
        signedAt: created.signedAt,
      },
    });
  } catch (error) {
    console.error("Failed to sign constitution:", error);
    return NextResponse.json(
      { error: "Failed to sign constitution" },
      { status: 500 }
    );
  }
}
