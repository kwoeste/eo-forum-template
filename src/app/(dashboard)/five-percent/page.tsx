"use client";

import { useState, useEffect, useCallback } from "react";
import { FivePercentForm } from "./five-percent-form";
import { FivePercentScanUpload, FivePercentScanViewer } from "./five-percent-scan";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getReflectionFileUrls, isUploadedReflection } from "@/lib/five-percent";

interface Reflection {
  id: string;
  workFeelings: string | null;
  workCauses: string | null;
  workSignificance: string | null;
  familyFeelings: string | null;
  familyCauses: string | null;
  familySignificance: string | null;
  personalFeelings: string | null;
  personalCauses: string | null;
  personalSignificance: string | null;
  future30to60: string | null;
  whyTopics: string | null;
  whatHowTopics: string | null;
  completedAt: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

type FivePercentView = "list" | "form" | "upload" | "scan";

export default function FivePercentPage() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReflection, setActiveReflection] = useState<Reflection | null>(null);
  const [view, setView] = useState<FivePercentView>("list");
  const [memberName, setMemberName] = useState("");

  const fetchReflections = useCallback(async () => {
    try {
      const response = await fetch("/api/five-percent");
      if (response.ok) {
        const data = await response.json();
        setReflections(data.reflections || []);
        setMemberName(data.memberName || "");
      }
    } catch (error) {
      console.error("Failed to fetch reflections:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch of private history
    void fetchReflections();
  }, [fetchReflections]);

  const handleCreateNew = () => {
    setActiveReflection(null);
    setView("form");
  };

  const handleOpenReflection = (reflection: Reflection) => {
    setActiveReflection(reflection);
    setView(isUploadedReflection(reflection.pdfUrl) ? "scan" : "form");
  };

  const handleDownload = (reflection: Reflection) => {
    if (isUploadedReflection(reflection.pdfUrl)) {
      const files = getReflectionFileUrls(reflection.pdfUrl);
      if (files.length === 1) {
        window.open(files[0], "_blank");
        return;
      }
      handleOpenReflection(reflection);
      return;
    }

    window.open(`/api/five-percent/${reflection.id}/pdf`, "_blank");
  };

  const handleFormSaved = () => {
    fetchReflections();
  };

  const handleBack = () => {
    setView("list");
    setActiveReflection(null);
    fetchReflections();
  };

  const handleUploaded = () => {
    setView("list");
    setActiveReflection(null);
    fetchReflections();
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const zonedDate = toZonedTime(date, "America/New_York");
      return format(zonedDate, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="eo-page">
        <div className="text-center py-12 text-stone-500">Loading...</div>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case "form":
        return (
          <div className="eo-page">
            <div className="eo-toolbar print-hide">
              <button onClick={handleBack} className="eo-resource-link">
                ← Back to History
              </button>
              <Link href="/library#feelings-inventory" className="eo-resource-link">
                <span className="eo-resource-icon">📋</span>
                <span>Feelings and Needs Inventory</span>
              </Link>
            </div>
            <FivePercentForm
              initialData={activeReflection}
              onSaved={handleFormSaved}
              memberName={memberName}
              onUploadInstead={!activeReflection ? () => setView("upload") : undefined}
            />
          </div>
        );
      case "upload":
        return (
          <div className="eo-page">
            <div className="eo-toolbar print-hide">
              <button onClick={handleBack} className="eo-resource-link">
                ← Back to History
              </button>
              <Link href="/library#feelings-inventory" className="eo-resource-link">
                <span className="eo-resource-icon">📋</span>
                <span>Feelings and Needs Inventory</span>
              </Link>
            </div>
            <FivePercentScanUpload onUploaded={handleUploaded} onCancel={handleBack} />
          </div>
        );
      case "scan":
        if (!activeReflection) {
          return null;
        }
        return (
          <div className="eo-page">
            <div className="eo-toolbar print-hide">
              <button onClick={handleBack} className="eo-resource-link">
                ← Back to History
              </button>
              <Link href="/library#feelings-inventory" className="eo-resource-link">
                <span className="eo-resource-icon">📋</span>
                <span>Feelings and Needs Inventory</span>
              </Link>
            </div>
            <FivePercentScanViewer
              reflection={activeReflection}
              memberName={memberName}
              onBack={handleBack}
            />
          </div>
        );
      case "list":
        return (
          <div>
            <PageHeader
              title="5% Reflection Worksheet"
              description="Your personal reflection history"
            />
            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateNew}
                    className="btn btn-primary"
                  >
                    + Create New
                  </button>
                  <button
                    onClick={() => setView("upload")}
                    className="btn btn-ghost"
                  >
                    Upload Photo
                  </button>
                </div>
                <Link href="/library#feelings-inventory" className="text-sm text-amber-700 hover:underline">
                  Feelings Inventory →
                </Link>
              </div>

              {reflections.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-stone-500">
                    No reflections yet. Create one above or upload a photo of your paper worksheet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reflections.map((reflection) => {
                    const uploaded = isUploadedReflection(reflection.pdfUrl);
                    const uploadedFiles = getReflectionFileUrls(reflection.pdfUrl);
                    const hasContent =
                      uploaded ||
                      Boolean(
                        reflection.workFeelings ||
                          reflection.familyFeelings ||
                          reflection.personalFeelings
                      );
                    const isDraft = !reflection.completedAt;

                    return (
                      <div
                        key={reflection.id}
                        className={`card p-4 flex items-center justify-between ${
                          isDraft ? "border-l-4 border-l-amber-400" : ""
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            {isDraft && (
                              <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded uppercase">
                                Draft
                              </span>
                            )}
                            {uploaded && (
                              <span className="inline-block px-1.5 py-0.5 bg-sky-100 text-sky-800 text-xs font-semibold rounded uppercase">
                                Photo
                              </span>
                            )}
                            <span className="font-medium text-stone-900">
                              {reflection.completedAt
                                ? `Completed ${formatDateTime(reflection.completedAt)}`
                                : `Last saved ${formatDateTime(reflection.updatedAt)}`}
                            </span>
                          </div>
                          <div className="text-sm text-stone-500 mt-1">
                            {uploaded
                              ? `${uploadedFiles.length} uploaded file${
                                  uploadedFiles.length === 1 ? "" : "s"
                                }`
                              : hasContent
                                ? "Has content"
                                : "Empty"}
                            {!isDraft && " • "}
                            {!isDraft && (
                              <span className="text-green-600">
                                {uploaded ? "Photo available" : "PDF available"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenReflection(reflection)}
                            className="btn btn-ghost text-sm"
                          >
                            {isDraft ? "Continue" : "View"}
                          </button>
                          {isDraft && hasContent && (
                            <button
                              onClick={() => window.open(`/api/five-percent/${reflection.id}/pdf?draft=true`, "_blank")}
                              className="btn btn-ghost text-sm"
                              title="Download current draft as PDF (labeled DRAFT)"
                            >
                              Draft PDF
                            </button>
                          )}
                          {!isDraft && (
                            <button
                              onClick={() => handleDownload(reflection)}
                              className="btn btn-primary text-sm"
                            >
                              {uploaded ? "Open Photo" : "Download PDF"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-stone-400 text-center mt-6">
                Private to you only
              </p>
            </div>
          </div>
        );
      default: {
        const _exhaustive: never = view;
        return _exhaustive;
      }
    }
  };

  return renderView();
}
