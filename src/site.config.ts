/**
 * Site-wide settings for your forum. Change these via environment variables
 * (see .env.example) — you should not need to edit code to rebrand the site.
 *
 * NEXT_PUBLIC_* values are visible in the browser (that's fine: they are
 * names and email addresses of your own forum officers, not secrets).
 */
function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const siteConfig = {
  /** Display name, e.g. "The Trailblazers" */
  forumName: process.env.NEXT_PUBLIC_FORUM_NAME || "Our EO Forum",
  /** EO chapter, e.g. "EO Chicago" */
  chapterName: process.env.NEXT_PUBLIC_CHAPTER_NAME || "EO Chapter",
  /** Your domain without https://, e.g. "ourforum.com" (used in calendar invite IDs) */
  domain: process.env.NEXT_PUBLIC_SITE_DOMAIN || "example.com",
  /** Name of this year's constitution, e.g. "2026–27 Constitution" */
  constitutionTitle: process.env.NEXT_PUBLIC_CONSTITUTION_TITLE || "Forum Constitution",
  /** Optional link to your constitution document (Google Drive etc.) */
  constitutionUrl: process.env.NEXT_PUBLIC_CONSTITUTION_URL || "",
  /** Site admin — can see bug reports, edit everything */
  adminEmail: (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com").toLowerCase(),
  /** Moderator — can upload agendas, manage deep dives */
  moderatorEmail: (process.env.NEXT_PUBLIC_MODERATOR_EMAIL || "").toLowerCase(),
  /** Treasurer — can edit treasurer reports */
  treasurerEmail: (process.env.NEXT_PUBLIC_TREASURER_EMAIL || "").toLowerCase(),
  treasurerName: process.env.NEXT_PUBLIC_TREASURER_NAME || "the Treasurer",
  retreatCoordinatorName: process.env.NEXT_PUBLIC_RETREAT_COORDINATOR_NAME || "the Retreat Coordinator",
};

/**
 * Server-only: who is allowed to sign in. Comma-separated emails in
 * ALLOWED_MEMBER_EMAILS. The admin email is always allowed.
 */
export function allowedMemberEmails(): string[] {
  return Array.from(new Set([siteConfig.adminEmail, ...list(process.env.ALLOWED_MEMBER_EMAILS)]));
}

export function isEmail(email: string | null | undefined, target: string): boolean {
  return !!target && email?.toLowerCase() === target;
}
