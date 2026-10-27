import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import path from "path";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import { bugReports, members } from "@/db/schema";
import {
  BUG_REPORT_MAX_DESCRIPTION,
  BUG_REPORT_MAX_SCREENSHOT_BYTES,
  BUG_REPORT_MIN_DESCRIPTION,
  BUG_REPORT_UPLOAD_FOLDER,
  isAllowedScreenshotType,
  sanitizePagePath,
  sanitizePageUrl,
  type BugReportRecord,
} from "@/lib/bug-report";
import { deliverBugReport } from "@/lib/deliver-bug-report";
import { saveUploadedFile } from "@/lib/storage";

function fileExtension(file: File): string {
  const ext = path.extname(file.name).toLowerCase();
  if (ext && /^\.[a-z0-9]+$/.test(ext)) {
    return ext;
  }
  return "";
}

async function findMemberId(
  userId: string,
  email: string | undefined
): Promise<string | null> {
  const byClerk = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.clerkUserId, userId))
    .limit(1);

  if (byClerk[0]) {
    return byClerk[0].id;
  }

  if (!email) {
    return null;
  }

  const byEmail = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  return byEmail[0]?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const reporterEmail =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses[0]?.emailAddress;
    if (!reporterEmail) {
      return NextResponse.json(
        { error: "Your account needs an email address to send a report." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const description = String(formData.get("description") || "").trim();
    const pagePath = sanitizePagePath(String(formData.get("pagePath") || "/"));
    const pageUrl = sanitizePageUrl(String(formData.get("pageUrl") || ""));
    const screenshot = formData.get("screenshot");

    if (
      description.length < BUG_REPORT_MIN_DESCRIPTION ||
      description.length > BUG_REPORT_MAX_DESCRIPTION
    ) {
      return NextResponse.json(
        {
          error: `Please describe the problem in ${BUG_REPORT_MIN_DESCRIPTION}–${BUG_REPORT_MAX_DESCRIPTION} characters.`,
        },
        { status: 400 }
      );
    }

    let screenshotFile: File | null = null;
    if (screenshot instanceof File && screenshot.size > 0) {
      if (
        !isAllowedScreenshotType(screenshot.type) &&
        !fileExtension(screenshot)
      ) {
        return NextResponse.json(
          { error: "Please attach a screenshot image." },
          { status: 400 }
        );
      }
      if (screenshot.size > BUG_REPORT_MAX_SCREENSHOT_BYTES) {
        return NextResponse.json(
          { error: "Screenshot is too large. Maximum size is 15MB." },
          { status: 400 }
        );
      }
      screenshotFile = screenshot;
    }

    const reporterName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.fullName ||
      reporterEmail;
    const memberId = await findMemberId(userId, reporterEmail.toLowerCase());
    const reportId = uuidv4();

    let screenshotUrl: string | null = null;
    let screenshotFileName: string | null = null;
    let screenshotBuffer: Buffer | undefined;

    if (screenshotFile) {
      screenshotFileName = screenshotFile.name;
      screenshotBuffer = Buffer.from(await screenshotFile.arrayBuffer());
      const filename = `${reportId}${fileExtension(screenshotFile) || ".jpg"}`;
      const saved = await saveUploadedFile({
        folder: BUG_REPORT_UPLOAD_FOLDER,
        filename,
        data: screenshotBuffer,
        contentType: screenshotFile.type || undefined,
      });
      screenshotUrl = saved.url;
    }

    const createdAt = new Date();
    await db.insert(bugReports).values({
      id: reportId,
      memberId,
      reporterName,
      reporterEmail: reporterEmail.toLowerCase(),
      pagePath,
      pageUrl,
      userAgent: request.headers.get("user-agent"),
      description,
      screenshotUrl,
      screenshotFileName,
      createdAt,
    });

    const record: BugReportRecord = {
      id: reportId,
      reporterName,
      reporterEmail: reporterEmail.toLowerCase(),
      pagePath,
      pageUrl,
      userAgent: request.headers.get("user-agent"),
      description,
      screenshotUrl,
      screenshotFileName,
      createdAt,
    };

    const delivery = await deliverBugReport(
      record,
      screenshotBuffer && screenshotFileName
        ? { filename: screenshotFileName, content: screenshotBuffer }
        : undefined
    );

    if (delivery.emailSentAt || delivery.cursorDispatchedAt) {
      await db
        .update(bugReports)
        .set({
          emailSentAt: delivery.emailSentAt,
          cursorDispatchedAt: delivery.cursorDispatchedAt,
          cursorDestination: delivery.cursorDestination,
        })
        .where(eq(bugReports.id, reportId));
    }

    return NextResponse.json({ success: true, id: reportId });
  } catch (error) {
    console.error("Failed to submit bug report:", error);
    const message =
      error instanceof Error ? error.message : "Failed to submit bug report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
