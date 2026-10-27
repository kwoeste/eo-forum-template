"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  getReflectionFileUrls,
  isImageFileUrl,
} from "@/lib/five-percent";
import { prepareUploadFiles } from "@/lib/prepare-upload-file";

interface UploadedReflection {
  id: string;
  pdfUrl: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FivePercentScanUploadProps {
  onUploaded: () => void;
  onCancel: () => void;
}

const ACCEPT = "image/*,.pdf,.heic,.heif";
const MAX_FILES = 5;

function formatDateTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const zonedDate = toZonedTime(date, "America/New_York");
    return format(zonedDate, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

export function FivePercentScanUpload({
  onUploaded,
  onCancel,
}: FivePercentScanUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const next = [...files, ...Array.from(selected)].slice(0, MAX_FILES);
    setFiles(next);
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert("Please choose a photo or PDF of your 5% reflection.");
      return;
    }

    setUploading(true);
    try {
      const prepared = await prepareUploadFiles(files);
      const formData = new FormData();
      for (const file of prepared) {
        formData.append("files", file);
      }

      const response = await fetch("/api/five-percent/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        onUploaded();
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to upload reflection photo");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload reflection photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="eo-worksheet" style={{ padding: "1.5rem" }}>
      <div className="eo-masthead" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <span className="eo-category">Forum Training | Worksheets</span>
        <h1 className="eo-title">UPLOAD 5% REFLECTION</h1>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.5rem", lineHeight: 1.5 }}>
          Prefer the paper worksheet? Take a photo of your completed 5% reflection PDF
          or upload a scan. You do not need to retype it on the site.
        </p>
      </div>

      <label
        style={{
          display: "block",
          padding: "2rem 1.5rem",
          textAlign: "center",
          background: "#f9fafb",
          border: "1px dashed #d1d5db",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        <div style={{ fontWeight: 500, color: "#1f2937", marginBottom: "0.375rem" }}>
          Choose photos or a PDF
        </div>
        <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
          JPEG, PNG, WebP, HEIC, or PDF · up to {MAX_FILES} files · 15MB each
        </div>
        <input
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {files.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "1.25rem 0 0" }}>
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.8125rem", color: "#1f2937" }}>
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="eo-btn eo-btn-secondary"
                style={{ fontSize: "0.75rem" }}
                disabled={uploading}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="eo-footer" style={{ marginTop: "1.5rem", padding: 0 }}>
        <span className="eo-privacy">Private to you only</span>
        <div className="eo-actions print-hide">
          <button
            type="button"
            onClick={onCancel}
            className="eo-btn eo-btn-secondary"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="eo-btn eo-btn-primary"
            disabled={uploading || files.length === 0}
          >
            {uploading ? "Uploading..." : "Save Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FivePercentScanViewerProps {
  reflection: UploadedReflection;
  memberName: string;
  onBack: () => void;
}

export function FivePercentScanViewer({
  reflection,
  memberName,
  onBack,
}: FivePercentScanViewerProps) {
  const files = getReflectionFileUrls(reflection.pdfUrl);
  const completedLabel = reflection.completedAt
    ? formatDateTime(reflection.completedAt)
    : formatDateTime(reflection.updatedAt);

  return (
    <div className="eo-worksheet" style={{ padding: "1.5rem" }}>
      <div className="eo-masthead" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <span className="eo-category">Forum Training | Worksheets</span>
        <h1 className="eo-title">5% REFLECTION WORKSHEET</h1>
        <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.5rem" }}>
          {memberName ? `${memberName} • ` : ""}
          Uploaded photo · Completed {completedLabel}
        </p>
      </div>

      {files.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No uploaded file found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {files.map((url, index) => (
            <UploadedFilePreview key={url} url={url} index={index} />
          ))}
        </div>
      )}

      <div className="eo-footer" style={{ marginTop: "1.5rem", padding: 0 }}>
        <span className="eo-privacy">Private to you only</span>
        <div className="eo-actions print-hide">
          <button type="button" onClick={onBack} className="eo-btn eo-btn-secondary">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadedFilePreview({ url, index }: { url: string; index: number }) {
  const [brokenImage, setBrokenImage] = useState(false);
  const canShowImage = isImageFileUrl(url) && !brokenImage;

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#f9fafb",
      }}
    >
      {canShowImage ? (
        // User-uploaded scans are stored under /uploads and are not a good fit for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Uploaded 5% reflection ${index + 1}`}
          style={{ width: "100%", display: "block" }}
          onError={() => setBrokenImage(true)}
        />
      ) : (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#6b7280", marginBottom: "0.75rem" }}>
            {isImageFileUrl(url)
              ? "This photo format may not preview in your browser."
              : "PDF uploaded. Open it to view the reflection."}
          </p>
        </div>
      )}
      <div style={{ padding: "0.75rem 1rem", display: "flex", justifyContent: "flex-end" }}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="eo-btn eo-btn-primary"
          style={{ textDecoration: "none" }}
        >
          {isImageFileUrl(url) ? "Open Photo" : "Open PDF"}
        </a>
      </div>
    </div>
  );
}
