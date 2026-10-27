import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isSiteAdminEmail } from "@/lib/admin";
import { allowedMemberEmails } from "@/site.config";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const isBugsRoute = createRouteMatcher(["/bugs(.*)"]);

const ALLOWED_EMAILS = allowedMemberEmails();

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  const userEmail = sessionClaims?.email as string | undefined;

  if (userEmail && !ALLOWED_EMAILS.includes(userEmail.toLowerCase())) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("error", "not_allowed");
    return NextResponse.redirect(signInUrl);
  }

  if (isBugsRoute(req) && userEmail && !isSiteAdminEmail(userEmail)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
