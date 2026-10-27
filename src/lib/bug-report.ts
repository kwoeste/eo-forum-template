import { siteConfig, isEmail } from "@/site.config";
export const BUG_REPORT_MIN_DESCRIPTION = 3;
export const BUG_REPORT_MAX_DESCRIPTION = 8000;
export const BUG_REPORT_MAX_SCREENSHOT_BYTES = 15 * 1024 * 1024;
export const BUG_REPORT_UPLOAD_FOLDER = "bug-reports";

export const BUG_REPORT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type BugReportCursorDestination = "automation" | "cloud_agent";

export type BugReportRecord = {
  id: string;
  reporterName: string;
  reporterEmail: string;
  pagePath: string;
  pageUrl: string | null;
  userAgent: string | null;
  description: string;
  screenshotUrl: string | null;
  screenshotFileName: string | null;
  createdAt: Date;
};

export type BugReportWebhookPayload = {
  source: "eo-forum";
  event: "bug_report";
  report: {
    id: string;
    description: string;
    pagePath: string;
    pageUrl: string | null;
    reporterName: string;
    reporterEmail: string;
    userAgent: string | null;
    screenshotUrl: string | null;
    createdAt: string;
  };
};

export function isAllowedScreenshotType(mimeType: string): boolean {
  return (BUG_REPORT_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function sanitizePagePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.length > 500) {
    return "/";
  }
  return trimmed;
}

export function sanitizePageUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildBugReportWebhookPayload(
  report: BugReportRecord
): BugReportWebhookPayload {
  return {
    source: "eo-forum",
    event: "bug_report",
    report: {
      id: report.id,
      description: report.description,
      pagePath: report.pagePath,
      pageUrl: report.pageUrl,
      reporterName: report.reporterName,
      reporterEmail: report.reporterEmail,
      userAgent: report.userAgent,
      screenshotUrl: report.screenshotUrl,
      createdAt: report.createdAt.toISOString(),
    },
  };
}

export function buildCloudAgentPrompt(report: BugReportRecord): string {
  const screenshotLine = report.screenshotUrl
    ? `Screenshot: ${report.screenshotUrl}`
    : "Screenshot: none attached";

  return [
    `You were launched from ${siteConfig.forumName} forum bug-report form.`,
    "A signed-in member reported a problem on the live site.",
    "",
    "Report id: " + report.id,
    "Page: " + report.pagePath,
    "Page URL: " + (report.pageUrl ?? "unknown"),
    "Reporter: " + report.reporterName + " <" + report.reporterEmail + ">",
    "User agent: " + (report.userAgent ?? "unknown"),
    screenshotLine,
    "",
    "What they wrote:",
    report.description,
    "",
    "If a screenshot is attached, look at it.",
    "If this is a clear site bug, investigate and fix it, then open a draft pull request.",
    "If this is a feature request, a taste note, or too vague to reproduce, do not change code.",
    "In that case, leave a short written summary of what you would need from the site admin.",
  ].join("\n");
}

export function bugReportAgentName(pagePath: string): string {
  const suffix = pagePath === "/" ? "home" : pagePath.replace(/^\//, "");
  const name = `Bug report: ${suffix}`;
  return name.slice(0, 100);
}
