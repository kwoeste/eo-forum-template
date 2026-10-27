import { siteConfig, isEmail } from "@/site.config";
import { Resend } from "resend";
import {
  buildBugReportWebhookPayload,
  buildCloudAgentPrompt,
  bugReportAgentName,
  type BugReportCursorDestination,
  type BugReportRecord,
} from "@/lib/bug-report";

const DEFAULT_TO_EMAIL = siteConfig.adminEmail;
const DEFAULT_FROM_EMAIL = `${siteConfig.forumName} <onboarding@resend.dev>`;
const DEFAULT_GITHUB_REPO = "";

export type BugReportDeliveryResult = {
  emailSentAt: Date | null;
  cursorDispatchedAt: Date | null;
  cursorDestination: BugReportCursorDestination | null;
};

type CursorDestination =
  | { kind: "automation"; url: string; key: string }
  | { kind: "cloud_agent"; apiKey: string }
  | { kind: "none" };

function assertNever(value: never): never {
  throw new Error(`Unexpected cursor destination: ${String(value)}`);
}

function resolveCursorDestination(): CursorDestination {
  const webhookUrl = process.env.CURSOR_AUTOMATION_WEBHOOK_URL?.trim();
  const webhookKey = process.env.CURSOR_AUTOMATION_WEBHOOK_KEY?.trim();
  if (webhookUrl && webhookKey) {
    return { kind: "automation", url: webhookUrl, key: webhookKey };
  }

  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (apiKey) {
    return { kind: "cloud_agent", apiKey };
  }

  return { kind: "none" };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(report: BugReportRecord): string {
  const screenshot = report.screenshotUrl
    ? `<p><strong>Screenshot:</strong> <a href="${escapeHtml(report.screenshotUrl)}">${escapeHtml(report.screenshotUrl)}</a></p>
       <p><img src="${escapeHtml(report.screenshotUrl)}" alt="Bug screenshot" style="max-width:100%;border:1px solid #e7e5e4;border-radius:8px" /></p>`
    : "<p><strong>Screenshot:</strong> none</p>";

  return `
    <h2>New bug report</h2>
    <p><strong>From:</strong> ${escapeHtml(report.reporterName)} &lt;${escapeHtml(report.reporterEmail)}&gt;</p>
    <p><strong>Page:</strong> ${escapeHtml(report.pagePath)}</p>
    <p><strong>URL:</strong> ${escapeHtml(report.pageUrl ?? "unknown")}</p>
    <p><strong>Report id:</strong> ${escapeHtml(report.id)}</p>
    <p><strong>User agent:</strong> ${escapeHtml(report.userAgent ?? "unknown")}</p>
    <p><strong>What happened:</strong></p>
    <pre style="white-space:pre-wrap;font-family:ui-sans-serif,system-ui,sans-serif">${escapeHtml(report.description)}</pre>
    ${screenshot}
  `;
}

async function sendBugReportEmail(
  report: BugReportRecord,
  screenshot?: { filename: string; content: Buffer }
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return false;
  }

  const resend = new Resend(apiKey);
  const to = process.env.BUG_REPORT_TO_EMAIL?.trim() || DEFAULT_TO_EMAIL;
  const from = process.env.BUG_REPORT_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
  const result = await resend.emails.send({
    from,
    to,
    replyTo: report.reporterEmail,
    subject: `Bug report on ${report.pagePath}`,
    html: buildEmailHtml(report),
    attachments: screenshot
      ? [{ filename: screenshot.filename, content: screenshot.content }]
      : undefined,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return true;
}

async function dispatchToAutomation(
  report: BugReportRecord,
  destination: Extract<CursorDestination, { kind: "automation" }>
): Promise<void> {
  const response = await fetch(destination.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${destination.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBugReportWebhookPayload(report)),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Cursor automation webhook failed (${response.status}): ${detail.slice(0, 400)}`
    );
  }
}

async function dispatchToCloudAgent(
  report: BugReportRecord,
  destination: Extract<CursorDestination, { kind: "cloud_agent" }>
): Promise<void> {
  const repoUrl = process.env.CURSOR_GITHUB_REPO?.trim() || DEFAULT_GITHUB_REPO;
  const images = report.screenshotUrl
    ? [{ url: report.screenshotUrl }]
    : undefined;

  const response = await fetch("https://api.cursor.com/v1/agents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${destination.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: bugReportAgentName(report.pagePath),
      prompt: {
        text: buildCloudAgentPrompt(report),
        images,
      },
      repos: [{ url: repoUrl, startingRef: "main" }],
      autoCreatePR: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Cursor Cloud Agents API failed (${response.status}): ${detail.slice(0, 400)}`
    );
  }
}

async function dispatchToCursor(
  report: BugReportRecord
): Promise<BugReportCursorDestination | null> {
  const destination = resolveCursorDestination();

  switch (destination.kind) {
    case "automation":
      await dispatchToAutomation(report, destination);
      return "automation";
    case "cloud_agent":
      await dispatchToCloudAgent(report, destination);
      return "cloud_agent";
    case "none":
      return null;
    default:
      return assertNever(destination);
  }
}

export async function deliverBugReport(
  report: BugReportRecord,
  screenshot?: { filename: string; content: Buffer }
): Promise<BugReportDeliveryResult> {
  const result: BugReportDeliveryResult = {
    emailSentAt: null,
    cursorDispatchedAt: null,
    cursorDestination: null,
  };

  try {
    const emailed = await sendBugReportEmail(report, screenshot);
    if (emailed) {
      result.emailSentAt = new Date();
    }
  } catch (error) {
    console.error("Bug report email failed:", error);
  }

  try {
    const destination = await dispatchToCursor(report);
    if (destination) {
      result.cursorDispatchedAt = new Date();
      result.cursorDestination = destination;
    }
  } catch (error) {
    console.error("Bug report Cursor dispatch failed:", error);
  }

  return result;
}
