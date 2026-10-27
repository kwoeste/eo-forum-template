import { siteConfig } from "@/site.config";

export const SITE_ADMIN_EMAIL = siteConfig.adminEmail;

export function isSiteAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === SITE_ADMIN_EMAIL;
}

export function clerkUserIsSiteAdmin(user: {
  emailAddresses?: Array<{ emailAddress: string }>;
  primaryEmailAddress?: { emailAddress: string } | null;
} | null | undefined): boolean {
  if (!user) {
    return false;
  }

  if (isSiteAdminEmail(user.primaryEmailAddress?.emailAddress)) {
    return true;
  }

  return (user.emailAddresses ?? []).some((address) =>
    isSiteAdminEmail(address.emailAddress)
  );
}
