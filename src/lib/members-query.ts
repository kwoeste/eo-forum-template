import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { toDateOnlyString } from "@/lib/birthdays";
import { INITIAL_MEMBERS } from "@/lib/members-data";

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  other?: string;
}

export interface ForumMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  isAdmin: boolean;
  birthday: string | null;
  spouse: string | null;
  about: string | null;
  profilePhotoUrl: string | null;
  businessName: string | null;
  businessWebsite: string | null;
  socialLinks: SocialLinks | null;
}

function displayName(row: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
  return row.name?.trim() || fullName || row.email || "Member";
}

function seededMembers(): ForumMember[] {
  return INITIAL_MEMBERS.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    isAdmin: member.isAdmin,
    birthday: member.birthday ?? null,
    spouse: member.spouse ?? null,
    about: member.about ?? null,
    profilePhotoUrl: null,
    businessName: null,
    businessWebsite: null,
    socialLinks: null,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getForumMembers(): Promise<ForumMember[]> {
  if (!process.env.DATABASE_URL) {
    return seededMembers();
  }

  try {
    const rows = await db
      .select({
        id: members.id,
        name: members.name,
        firstName: members.firstName,
        lastName: members.lastName,
        email: members.email,
        role: members.role,
        isAdmin: members.isAdmin,
        birthday: members.birthday,
        spouse: members.spouse,
        about: members.about,
        profilePhotoUrl: members.profilePhotoUrl,
        businessName: members.businessName,
        businessWebsite: members.businessWebsite,
        socialLinks: members.socialLinks,
      })
      .from(members);

    return rows
      .map((row) => ({
        id: row.id,
        name: displayName(row),
        email: row.email,
        role: row.role,
        isAdmin: row.isAdmin,
        birthday: toDateOnlyString(row.birthday),
        spouse: row.spouse,
        about: row.about,
        profilePhotoUrl: row.profilePhotoUrl,
        businessName: row.businessName,
        businessWebsite: row.businessWebsite,
        socialLinks: row.socialLinks as SocialLinks | null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to load members from database, using seeded roster", error);
    return seededMembers();
  }
}

export function memberDisplayName(row: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  return displayName(row);
}

export async function getMemberForAuth(
  userId: string,
  userEmail?: string | null
) {
  const byClerk = await db
    .select()
    .from(members)
    .where(eq(members.clerkUserId, userId))
    .limit(1);

  if (byClerk.length > 0) {
    return byClerk[0];
  }

  if (!userEmail) {
    return null;
  }

  const byEmail = await db
    .select()
    .from(members)
    .where(eq(members.email, userEmail.toLowerCase()))
    .limit(1);

  return byEmail[0] ?? null;
}
