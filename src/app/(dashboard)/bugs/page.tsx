import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { clerkUserIsSiteAdmin } from "@/lib/admin";
import { db } from "@/db";
import { bugReports } from "@/db/schema";
import { ensureBugReportsSchema } from "@/lib/ensure-bug-reports-schema";
import { BugsClient, type BugReportListItem } from "./bugs-client";

export const dynamic = "force-dynamic";

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export default async function BugsPage() {
  const user = await currentUser();
  if (!clerkUserIsSiteAdmin(user)) {
    notFound();
  }

  await ensureBugReportsSchema();

  const reports = await db
    .select()
    .from(bugReports)
    .orderBy(desc(bugReports.createdAt));

  const initialReports: BugReportListItem[] = reports.map((report) => ({
    id: report.id,
    reporterName: report.reporterName,
    reporterEmail: report.reporterEmail,
    pagePath: report.pagePath,
    pageUrl: report.pageUrl,
    userAgent: report.userAgent,
    description: report.description,
    screenshotUrl: report.screenshotUrl,
    screenshotFileName: report.screenshotFileName,
    emailSentAt: toIso(report.emailSentAt),
    cursorDispatchedAt: toIso(report.cursorDispatchedAt),
    cursorDestination: report.cursorDestination,
    createdAt: report.createdAt.toISOString(),
    fixedAt: toIso(report.fixedAt),
  }));

  return (
    <div>
      <PageHeader
        title="Bug reports"
        description="Only you can see this. Mark a report as fixed when the problem is done."
      />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <BugsClient initialReports={initialReports} />
      </div>
    </div>
  );
}
