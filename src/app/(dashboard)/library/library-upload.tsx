"use client";

import { useState, useEffect } from "react";
import { prepareUploadFile } from "@/lib/prepare-upload-file";

const FEELINGS_TITLE = "Feelings and Needs Inventory";
const FEELINGS_CATEGORY = "Feelings";

export function LibraryFeelingsUpload() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchExisting = async () => {
      try {
        const response = await fetch(`/api/library?category=${FEELINGS_CATEGORY}`);
        if (response.ok && !cancelled) {
          const data = await response.json();
          const existing = data.links?.find(
            (link: { title: string; fileUrl: string | null }) =>
              link.title === FEELINGS_TITLE && link.fileUrl
          );
          if (existing) {
            setFileUrl(existing.fileUrl);
            setFileName(FEELINGS_TITLE);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch feelings list:", error);
        }
      }
    };

    fetchExisting();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;

    setUploading(true);
    try {
      const prepared = await prepareUploadFile(file);
      const formData = new FormData();
      formData.append("file", prepared);
      formData.append("title", FEELINGS_TITLE);
      formData.append("category", FEELINGS_CATEGORY);
      formData.append("description", "Reference for 5% Reflection emotional vocabulary");

      const response = await fetch("/api/library/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to upload PDF");
        return;
      }

      const data = await response.json();
      setFileUrl(data.fileUrl);
      setFileName(data.fileName);
    } catch (error) {
      console.error("Library upload error:", error);
      alert("Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {fileUrl ? (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-amber-700 hover:underline"
        >
          {fileName || "View uploaded Feelings List"} →
        </a>
      ) : null}
      <label className="text-sm text-amber-700 hover:text-amber-800 cursor-pointer">
        {uploading ? "Uploading..." : fileUrl ? "Replace PDF" : "Choose PDF"}
        <input
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            void handleUpload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
