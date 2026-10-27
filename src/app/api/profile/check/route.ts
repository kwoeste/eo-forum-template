import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ profileCompleted: false });
    }

    const member = await db
      .select({ profileCompleted: members.profileCompleted })
      .from(members)
      .where(eq(members.email, userEmail.toLowerCase()))
      .limit(1);

    if (member.length === 0) {
      return NextResponse.json({ profileCompleted: false });
    }

    return NextResponse.json({ 
      profileCompleted: member[0].profileCompleted 
    });
  } catch (error) {
    console.error("Profile check error:", error);
    return NextResponse.json({ profileCompleted: true });
  }
}
