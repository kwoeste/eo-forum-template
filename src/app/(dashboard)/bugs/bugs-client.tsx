"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

export type BugReportListItem = {
  id: string;
  reporterName: string;
  reporterEmail: string;
  pagePath: string;
  pageUrl: string | null;
  userAgent: string | null;
  description: string;
  screenshotUrl: string | null;
  screenshotFileName: string | null;
  emailSentAt: string | null;
  cursorDispatchedAt: string | null;
  cursorDestination: string | null;
  createdAt: string;
  fixedAt: string | null;
};

type StatusFilter = "open" | "fixed" | "all";

function deliveryLabel(report: BugReportListItem): string {
  const parts: string[] = [];
  if (report.emailSentAt) {
    parts.push("Emailed");
  }
  if (report.cursorDispatchedAt) {
    parts.push(
      report.cursorDestination === "automation"
        ? "Sent to coding agent"
        : "Sent to Cursor"
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "Saved on the site only";
}

function isFixed(report: BugReportListItem): boolean {
  return report.fixedAt !== null;
}

export function BugsClient({
  initialReports,
}: {
  initialReports: BugReportListItem[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const openCount = reports.filter((report) => !isFixed(report)).length;
  const fixedCount = reports.length - openCount;

  const visibleReports = useMemo(() => {
    return reports
      .filter((report) => {
        const fixed = isFixed(report);
        switch (filter) {
          case "open":
            return !fixed;
          case "fixed":
            return fixed;
          case "all":
            return true;
          default: {
            const _exhaustive: never = filter;
            return _exhaustive;
          }
        }
      })
      .slice()
      .sort((a, b) => {
        const aFixed = isFixed(a) ? 1 : 0;
        const bFixed = isFixed(b) ? 1 : 0;
        if (aFixed !== bFixed) {
          return aFixed - bFixed;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [reports, filter]);

  const setFixed = async (id: string, fixed: boolean) => {
    let snapshot: BugReportListItem[] | null = null;
    setError(null);
    setPendingIds((current) => new Set(current).add(id));
    setReports((current) => {
      snapshot = current;
      return current.map((report) =>
        report.id === id
          ? { ...report, fixedAt: fixed ? new Date().toISOString() : null }
          : report
      );
    });

    try {
      const response = await fetch(`/api/bug-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixed }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not update this report.");
      }
      const data = (await response.json()) as {
        item?: { fixedAt: string | null };
      };
      const saved = data.item;
      if (saved) {
        setReports((current) =>
          current.map((report) =>
            report.id === id ? { ...report, fixedAt: saved.fixedAt } : report
          )
        );
      }
    } catch (updateError) {
      console.error("Failed to update bug report:", updateError);
      if (snapshot) {
        setReports(snapshot);
      }
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update this report."
      );
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      {reports.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["open", `Open (${openCount})`],
              ["fixed", `Fixed (${fixedCount})`],
              ["all", `All (${reports.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 text-sm rounded font-medium ${
                filter === value
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {reports.length === 0 ? (
        <section className="card p-6">
          <p className="text-sm text-stone-500">No reports yet.</p>
        </section>
      ) : visibleReports.length === 0 ? (
        <section className="card p-6">
          <p className="text-sm text-stone-500">
            {filter === "open"
              ? "No open reports. Fixed ones are under Fixed."
              : filter === "fixed"
                ? "No reports have been marked fixed yet."
                : "No reports yet."}
          </p>
        </section>
      ) : (
        visibleReports.map((report) => {
          const fixed = isFixed(report);
          const pending = pendingIds.has(report.id);
          return (
            <article
              key={report.id}
              className={`card p-6 space-y-3 ${fixed ? "opacity-70" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-stone-900 break-all">
                    {report.pagePath}
                  </h2>
                  <p className="text-sm text-stone-700 mt-1">
                    {report.reporterName}{" "}
                    <span className="text-stone-500">
                      {report.reporterEmail}
                    </span>
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    {format(new Date(report.createdAt), "MMM d, yyyy h:mm a")}
                    {report.pageUrl ? (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          href={report.pageUrl}
                          className="text-amber-800 hover:underline"
                        >
                          Open page
                        </a>
                      </>
                    ) : null}
                    {fixed && report.fixedAt ? (
                      <>
                        {" "}
                        · Fixed{" "}
                        {format(new Date(report.fixedAt), "MMM d, yyyy h:mm a")}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {fixed ? (
                    <span className="badge badge-success">Fixed</span>
                  ) : (
                    <span className="badge badge-accent">Open</span>
                  )}
                  <span className="badge badge-muted">
                    {deliveryLabel(report)}
                  </span>
                </div>
              </div>

              <p className="text-sm text-stone-800 whitespace-pre-wrap">
                {report.description}
              </p>

              {report.screenshotUrl ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Screenshot
                    {report.screenshotFileName
                      ? ` · ${report.screenshotFileName}`
                      : ""}
                  </p>
                  <a
                    href={report.screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    {/* User-uploaded screenshot; next/image is not a good fit for Blob URLs. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={report.screenshotUrl}
                      alt={report.screenshotFileName || "Bug screenshot"}
                      className="max-h-96 w-full object-contain rounded-md border border-stone-200 bg-stone-50"
                    />
                  </a>
                </div>
              ) : (
                <p className="text-xs text-stone-400">No screenshot attached.</p>
              )}

              {report.userAgent && (
                <p className="text-xs text-stone-400 break-all">
                  {report.userAgent}
                </p>
              )}

              <div>
                {fixed ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setFixed(report.id, false)}
                    className="px-2 py-1 text-xs rounded bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-50"
                  >
                    {pending ? "Updating…" : "Reopen"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setFixed(report.id, true)}
                    className="px-2 py-1 text-xs rounded bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-50"
                  >
                    {pending ? "Updating…" : "Mark as fixed"}
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
