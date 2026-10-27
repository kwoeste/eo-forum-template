"use client";
import { siteConfig, isEmail } from "@/site.config";

import { useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { prepareUploadFile } from "@/lib/prepare-upload-file";

interface Member {
  id: string;
  name: string;
  email: string | null;
  role: string;
  isAdmin: boolean;
}

interface Lifeline {
  id: string;
  memberId: string;
  memberName: string;
  fileName: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  createdAt: string;
  updatedAt: string;
}

interface LifelineClientProps {
  initialMembers: Member[];
}

export function LifelineClient({ initialMembers }: LifelineClientProps) {
  const { user } = useUser();
  const [lifelines, setLifelines] = useState<Lifeline[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [loadingLifelines, setLoadingLifelines] = useState(true);
  const [viewingLifeline, setViewingLifeline] = useState<Lifeline | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.emailAddresses?.some(
    (email) => isEmail(email.emailAddress, siteConfig.adminEmail)
  );

  const isLoggedIn = !!user;

  useState(() => {
    if (isLoggedIn) {
      fetch("/api/lifelines")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setLifelines(data);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingLifelines(false));
    } else {
      setLoadingLifelines(false);
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMemberId) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or image file (JPEG, PNG, GIF, WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const prepared = await prepareUploadFile(file);
      const formData = new FormData();
      formData.append("file", prepared);
      formData.append("memberId", selectedMemberId);

      const response = await fetch("/api/lifelines/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { lifeline } = await response.json();
        const member = initialMembers.find((m) => m.id === selectedMemberId);
        const newLifeline: Lifeline = {
          ...lifeline,
          memberName: member?.name || "Unknown",
        };

        setLifelines((prev) => {
          const existing = prev.findIndex((l) => l.memberId === selectedMemberId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newLifeline;
            return updated;
          }
          return [...prev, newLifeline];
        });

        setSelectedMemberId("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        alert("Timeline uploaded successfully!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to upload timeline");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload timeline");
    } finally {
      setUploading(false);
    }
  };

  const getLifelineForMember = (memberId: string) => {
    return lifelines.find((l) => l.memberId === memberId);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isPdf = (fileType: string | null) => fileType === "application/pdf";

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          What is a Timeline/Lifeline?
        </h2>
        <p className="text-slate-700">
          The Lifeline exercise helps forum members understand each other&apos;s
          personal journeys by mapping significant life events, both high points
          and challenges. This deep understanding builds trust and enables more
          meaningful experience sharing.
        </p>
      </section>

      <section className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b">
          <h2 className="text-lg font-semibold text-slate-900">
            Member Timelines
          </h2>
        </div>
        <div className="divide-y divide-slate-200">
          {initialMembers.map((member) => {
            const lifeline = getLifelineForMember(member.id);
            return (
              <div key={member.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center mr-4">
                      <span className="text-slate-600 font-medium">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{member.name}</h3>
                      <p className="text-sm text-slate-500">{member.role}</p>
                    </div>
                  </div>
                  {lifeline ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-2">
                        <p className="text-sm text-slate-700 font-medium">
                          {lifeline.fileName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(lifeline.fileSize)}
                        </p>
                      </div>
                      {isLoggedIn && (
                        <button
                          onClick={() => setViewingLifeline(lifeline)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
                        >
                          View
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                      Not uploaded
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {isAdmin && (
        <section className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Upload Timeline
          </h2>
          <p className="text-blue-800 text-sm mb-4">
            Upload a timeline/lifeline document for a member (PDF or image, max
            10MB).
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">
                Select Member
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a member...</option>
                {initialMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">
                Timeline File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileSelect}
                disabled={!selectedMemberId || uploading}
                className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 disabled:opacity-50"
              />
              <p className="text-xs text-blue-700 mt-1">
                Accepts PDF, JPEG, PNG, GIF, WebP (max 10MB)
              </p>
            </div>
            {uploading && (
              <p className="text-sm text-blue-700">Uploading...</p>
            )}
          </div>
        </section>
      )}

      {!isLoggedIn && (
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
          <p className="text-amber-800 text-sm">
            Please sign in to view member timelines.
          </p>
        </div>
      )}

      <div className="bg-slate-100 rounded-xl p-6 text-center">
        <p className="text-sm text-slate-600 italic">
          &ldquo;Understanding where we have been helps us see where we are going
          together.&rdquo;
        </p>
      </div>

      {viewingLifeline && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {viewingLifeline.memberName}&apos;s Timeline
                </h3>
                <p className="text-sm text-slate-500">
                  {viewingLifeline.fileName}
                </p>
              </div>
              <button
                onClick={() => setViewingLifeline(null)}
                className="text-slate-500 hover:text-slate-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {isPdf(viewingLifeline.fileType) ? (
                <iframe
                  src={viewingLifeline.fileUrl || ""}
                  className="w-full h-[70vh]"
                  title="Timeline PDF"
                />
              ) : (
                <img
                  src={viewingLifeline.fileUrl || ""}
                  alt={`${viewingLifeline.memberName}'s timeline`}
                  className="max-w-full h-auto mx-auto"
                />
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
              {viewingLifeline.fileUrl && (
                <a
                  href={viewingLifeline.fileUrl}
                  download={viewingLifeline.fileName}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Download
                </a>
              )}
              <button
                onClick={() => setViewingLifeline(null)}
                className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
