"use client";
import { siteConfig, isEmail } from "@/site.config";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { prepareUploadFile } from "@/lib/prepare-upload-file";

interface MeetingAgenda {
  meetingDate: string;
  meetingTitle: string;
  agenda: {
    id: string;
    fileName: string;
    fileUrl: string;
  } | null;
}

// Add your upcoming meeting dates, e.g. { date: "2027-01-14", label: "January 14, 2027" }
const UPCOMING_MEETING_DATES: Array<{ date: string; label: string }> = [];

export function LibraryAgendas() {
  const { user } = useUser();
  const [agendas, setAgendas] = useState<MeetingAgenda[]>([]);
  const [uploadingDate, setUploadingDate] = useState<string | null>(null);

  const isAdmin = user?.emailAddresses?.some(
    (email) => isEmail(email.emailAddress, siteConfig.adminEmail)
  );
  const isModerator = user?.emailAddresses?.some(
    (email) => isEmail(email.emailAddress, siteConfig.moderatorEmail)
  );
  const canUpload = isAdmin || isModerator;

  useEffect(() => {
    let cancelled = false;

    const fetchAgendas = async () => {
      try {
        const response = await fetch("/api/agendas");
        if (response.ok && !cancelled) {
          const data = await response.json();
          setAgendas(data.meetings || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch agendas:", error);
        }
      }
    };

    fetchAgendas();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpload = async (meetingDate: string, file: File | undefined) => {
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or image file");
      return;
    }

    setUploadingDate(meetingDate);
    try {
      const prepared = await prepareUploadFile(file);
      const formData = new FormData();
      formData.append("file", prepared);
      formData.append("meetingDate", meetingDate);

      const response = await fetch("/api/agendas/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAgendas((prev) => {
          const existing = prev.find((a) => a.meetingDate === meetingDate);
          if (existing) {
            return prev.map((a) =>
              a.meetingDate === meetingDate
                ? { ...a, agenda: { id: data.agendaId, fileName: data.fileName, fileUrl: data.fileUrl } }
                : a
            );
          }
          return [
            ...prev,
            {
              meetingDate,
              meetingTitle: "Forum Meeting",
              agenda: { id: data.agendaId, fileName: data.fileName, fileUrl: data.fileUrl },
            },
          ];
        });
      } else {
        const errData = await response.json().catch(() => null);
        alert(errData?.error || "Failed to upload agenda");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload agenda");
    } finally {
      setUploadingDate(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const upcomingWithAgendas = UPCOMING_MEETING_DATES.map((meeting) => {
    const stored = agendas.find((a) => a.meetingDate === meeting.date);
    return {
      date: meeting.date,
      label: meeting.label,
      agenda: stored?.agenda ?? null,
    };
  });

  const pastAgendas = agendas
    .filter((a) => !UPCOMING_MEETING_DATES.some((m) => m.date === a.meetingDate))
    .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));

  return (
    <div className="space-y-3">
      {upcomingWithAgendas.map((meeting) => (
        <div
          key={meeting.date}
          className="flex items-center justify-between p-3 bg-stone-50 rounded-lg"
        >
          <div>
            <p className="font-medium text-stone-900">{meeting.label}</p>
            {meeting.agenda ? (
              <a
                href={meeting.agenda.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-700 hover:underline"
              >
                {meeting.agenda.fileName} →
              </a>
            ) : (
              <p className="text-xs text-stone-500">No agenda uploaded yet</p>
            )}
          </div>
          {canUpload && (
            <label className="btn btn-ghost text-sm cursor-pointer">
              {uploadingDate === meeting.date
                ? "Uploading..."
                : meeting.agenda
                ? "Replace"
                : "Upload"}
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                disabled={uploadingDate === meeting.date}
                onChange={(e) => {
                  void handleUpload(meeting.date, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      ))}

      {pastAgendas.map((meeting) =>
        meeting.agenda ? (
          <Link
            key={meeting.meetingDate}
            href={meeting.agenda.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-stone-50 rounded-lg hover:bg-stone-100"
          >
            <div>
              <p className="font-medium text-stone-900">{formatDate(meeting.meetingDate)}</p>
              <p className="text-xs text-stone-500">{meeting.agenda.fileName}</p>
            </div>
            <span className="text-sm text-amber-700">View →</span>
          </Link>
        ) : null
      )}

      <Link
        href="#"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-3 bg-stone-50 rounded-lg hover:bg-stone-100"
      >
        <div>
          <p className="font-medium text-stone-900">August 13, 2026</p>
          <p className="text-xs text-stone-500">Forum Agenda 8-13-26.pdf (Drive)</p>
        </div>
        <span className="text-sm text-amber-700">View →</span>
      </Link>
    </div>
  );
}
