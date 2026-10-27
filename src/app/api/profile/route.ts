import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { members, lifelines, archetypes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toDateOnlyString } from "@/lib/birthdays";

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
      
      if (member.length > 0) {
        await db
          .update(members)
          .set({ clerkUserId: userId, updatedAt: new Date() })
          .where(eq(members.email, userEmail));
      }
    }

    if (member.length === 0) {
      return NextResponse.json({ profile: null });
    }

    const m = member[0];

    let lifelineData = null;
    let archetypeData = null;
    if (m.id) {
      const lifeline = await db
        .select()
        .from(lifelines)
        .where(eq(lifelines.memberId, m.id))
        .limit(1);
      if (lifeline.length > 0) {
        lifelineData = {
          url: lifeline[0].fileUrl,
          fileName: lifeline[0].fileName,
        };
      }

      const archetype = await db
        .select()
        .from(archetypes)
        .where(eq(archetypes.memberId, m.id))
        .limit(1);
      if (archetype.length > 0) {
        archetypeData = {
          url: archetype[0].fileUrl,
          fileName: archetype[0].fileName,
        };
      }
    }

    return NextResponse.json({
      profile: {
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        birthday: toDateOnlyString(m.birthday) || "",
        bio: m.about,
        spouseName: m.spouse,
        businessName: m.businessName,
        businessWebsite: m.businessWebsite,
        socialLinks: m.socialLinks || {},
        photoUrl: m.profilePhotoUrl,
        lifelineUrl: lifelineData?.url || null,
        lifelineFileName: lifelineData?.fileName || null,
        archetypeUrl: archetypeData?.url || null,
        archetypeFileName: archetypeData?.fileName || null,
        profileCompleted: m.profileCompleted,
        role: m.role,
      },
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
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

    const body = await request.json();
    const {
      firstName,
      lastName,
      birthday,
      bio,
      spouseName,
      businessName,
      businessWebsite,
      socialLinks,
      photoUrl,
    } = body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    let existing = await db
      .select()
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    if (existing.length === 0 && userEmail) {
      existing = await db
        .select()
        .from(members)
        .where(eq(members.email, userEmail))
        .limit(1);
    }

    if (existing.length > 0) {
      await db
        .update(members)
        .set({
          clerkUserId: userId,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          birthday: toDateOnlyString(birthday),
          about: bio,
          spouse: spouseName,
          businessName,
          businessWebsite,
          socialLinks: socialLinks || {},
          profilePhotoUrl: photoUrl,
          profileCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(members.id, existing[0].id));
    } else {
      return NextResponse.json(
        { error: "Your email is not in the member allowlist" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save profile:", error);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
