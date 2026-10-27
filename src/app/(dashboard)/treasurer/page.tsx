"use client";
import { siteConfig, isEmail } from "@/site.config";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { PageHeader } from "@/components/page-header";
import { INITIAL_MEMBERS } from "@/lib/members-data";
import { prepareUploadFile } from "@/lib/prepare-upload-file";

interface MemberDues {
  memberId: string;
  memberName: string;
  duesPaid: boolean;
  paidAmount: number;
  paidDate: string | null;
  notes: string;
}

interface TreasurerReport {
  id: string;
  title: string;
  date: string;
  balance: number | null;
  notes: string;
  fileUrl: string | null;
  fileName: string | null;
}

interface Fine {
  id: string;
  name: string;
  amount: number;
  description: string;
}

const INITIAL_FINES: Fine[] = [
  { id: "1", name: "Tardy / Early Departure", amount: 100, description: "Arriving late or leaving early from meeting" },
  { id: "2", name: "Unexcused Absence", amount: 150, description: "Missing meeting without prior notice" },
  { id: "3", name: "Phone Violation", amount: 100, description: "Using phone during meeting" },
];

const FISCAL_YEAR = "2026-2027";
const MEMBER_DUES_AMOUNT = 500;
const RETREAT_BUDGET_PER_MEMBER = 2500;

export default function TreasurerPage() {
  const { user, isLoaded } = useUser();
  const [reports, setReports] = useState<TreasurerReport[]>([]);
  const [fines, setFines] = useState<Fine[]>(INITIAL_FINES);
  const [memberDues, setMemberDues] = useState<MemberDues[]>(
    INITIAL_MEMBERS.map((m) => ({
      memberId: m.id,
      memberName: m.name,
      duesPaid: false,
      paidAmount: 0,
      paidDate: null,
      notes: "",
    }))
  );
  const [showAddReport, setShowAddReport] = useState(false);
  const [showEditFines, setShowEditFines] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingReportId, setUploadingReportId] = useState<string | null>(null);
  const [newReport, setNewReport] = useState({ title: "", date: "", balance: "", notes: "" });

  useEffect(() => {
    if (!isLoaded || !user) return;

    let cancelled = false;

    const fetchReports = async () => {
      try {
        const response = await fetch("/api/treasurer/reports");
        if (response.ok && !cancelled) {
          const data = await response.json();
          setReports(
            (data.reports || []).map((r: {
              id: string;
              title: string;
              reportDate: string;
              balance: number | null;
              notes: string | null;
              fileUrl: string | null;
              fileName: string | null;
            }) => ({
              id: r.id,
              title: r.title,
              date: r.reportDate,
              balance: r.balance,
              notes: r.notes || "",
              fileUrl: r.fileUrl,
              fileName: r.fileName,
            }))
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch reports:", error);
        }
      }
    };

    fetchReports();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  const isAdmin = user?.emailAddresses?.some(
    (email) => isEmail(email.emailAddress, siteConfig.adminEmail)
  );
  const isTreasurer = user?.emailAddresses?.some(
    (email) => isEmail(email.emailAddress, siteConfig.treasurerEmail)
  );
  const canEdit = isAdmin || isTreasurer;

  const handleDuesChange = (memberId: string, paid: boolean) => {
    setMemberDues(
      memberDues.map((d) =>
        d.memberId === memberId
          ? {
              ...d,
              duesPaid: paid,
              paidAmount: paid ? MEMBER_DUES_AMOUNT : 0,
              paidDate: paid ? new Date().toISOString().split("T")[0] : null,
            }
          : d
      )
    );
  };

  const handleAddReport = async () => {
    if (!newReport.title || !newReport.date) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", newReport.title);
      formData.append("date", newReport.date);
      if (newReport.balance) formData.append("balance", newReport.balance);
      if (newReport.notes) formData.append("notes", newReport.notes);

      const response = await fetch("/api/treasurer/reports", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const report: TreasurerReport = {
          id: data.report.id,
          title: data.report.title,
          date: data.report.reportDate,
          balance: data.report.balance,
          notes: data.report.notes || "",
          fileUrl: data.report.fileUrl,
          fileName: data.report.fileName,
        };
        setReports([report, ...reports]);
        setNewReport({ title: "", date: "", balance: "", notes: "" });
        setShowAddReport(false);
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to add report");
      }
    } catch (error) {
      console.error("Add report error:", error);
      alert("Failed to add report");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (reportId: string, file: File) => {
    setUploadingReportId(reportId);
    try {
      const prepared = await prepareUploadFile(file);
      const formData = new FormData();
      formData.append("file", prepared);

      const response = await fetch(`/api/treasurer/reports/${reportId}`, {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to upload report");
        return;
      }

      const data = await response.json();
      setReports(
        reports.map((r) =>
          r.id === reportId
            ? { ...r, fileUrl: data.report.fileUrl, fileName: data.report.fileName }
            : r
        )
      );
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload report");
    } finally {
      setUploadingReportId(null);
    }
  };

  const handleUpdateFine = (fineId: string, amount: number) => {
    setFines(fines.map((f) => (f.id === fineId ? { ...f, amount } : f)));
  };

  const paidCount = memberDues.filter((d) => d.duesPaid).length;
  const totalCollected = memberDues.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalExpected = INITIAL_MEMBERS.length * MEMBER_DUES_AMOUNT;

  return (
    <div>
      <PageHeader
        title="Treasurer"
        description={`Forum finances and member ledger • Treasurer: ${siteConfig.treasurerName}`}
      />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Dues Summary */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Dues Summary - FY {FISCAL_YEAR}</h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-stone-50 rounded-lg p-4 text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Member Dues</p>
              <p className="text-2xl font-bold text-stone-900">${MEMBER_DUES_AMOUNT}</p>
              <p className="text-xs text-stone-500">per member / year</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-4 text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Collected</p>
              <p className="text-2xl font-bold text-green-700">${totalCollected.toLocaleString()}</p>
              <p className="text-xs text-stone-500">of ${totalExpected.toLocaleString()}</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-4 text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Members Paid</p>
              <p className="text-2xl font-bold text-stone-900">{paidCount} / {INITIAL_MEMBERS.length}</p>
              <p className="text-xs text-stone-500">members</p>
            </div>
          </div>

          <h3 className="text-sm font-medium text-stone-700 mb-3">Member Dues Status</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-2 text-xs font-medium text-stone-500 uppercase">Member</th>
                  <th className="text-center py-2 text-xs font-medium text-stone-500 uppercase">Status</th>
                  <th className="text-right py-2 text-xs font-medium text-stone-500 uppercase">Amount</th>
                  {canEdit && <th className="text-right py-2 text-xs font-medium text-stone-500 uppercase">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {memberDues.map((dues) => (
                  <tr key={dues.memberId}>
                    <td className="py-3 text-sm text-stone-900">{dues.memberName}</td>
                    <td className="py-3 text-center">
                      {dues.duesPaid ? (
                        <span className="badge badge-success">Paid</span>
                      ) : (
                        <span className="badge badge-muted">Not Paid</span>
                      )}
                    </td>
                    <td className="py-3 text-sm text-right text-stone-600">
                      {dues.duesPaid ? `$${dues.paidAmount}` : "—"}
                    </td>
                    {canEdit && (
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDuesChange(dues.memberId, !dues.duesPaid)}
                          className="text-xs text-amber-700 hover:text-amber-800"
                        >
                          {dues.duesPaid ? "Mark Unpaid" : "Mark Paid"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Retreat Budget */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Retreat Budget</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">Per Member</p>
              <p className="text-2xl font-bold text-amber-900">${RETREAT_BUDGET_PER_MEMBER.toLocaleString()}</p>
              <p className="text-xs text-amber-700">annual retreat budget cap</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-amber-900">
                ${(RETREAT_BUDGET_PER_MEMBER * INITIAL_MEMBERS.length).toLocaleString()}
              </p>
              <p className="text-xs text-amber-700">{INITIAL_MEMBERS.length} members</p>
            </div>
          </div>
        </section>

        {/* Reports & Documents */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900">Reports & Documents</h2>
            {canEdit && (
              <button
                onClick={() => setShowAddReport(!showAddReport)}
                className="btn btn-primary text-sm"
              >
                {showAddReport ? "Cancel" : "Add Report"}
              </button>
            )}
          </div>

          {showAddReport && (
            <div className="bg-stone-50 rounded-lg p-4 mb-4">
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newReport.title}
                    onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                    className="w-full"
                    placeholder="e.g., Q3 Financial Report"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newReport.date}
                    onChange={(e) => setNewReport({ ...newReport, date: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-1">Balance (optional)</label>
                <input
                  type="number"
                  value={newReport.balance}
                  onChange={(e) => setNewReport({ ...newReport, balance: e.target.value })}
                  className="w-full"
                  placeholder="Current balance"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
                <textarea
                  value={newReport.notes}
                  onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
                  rows={2}
                  className="w-full"
                />
              </div>
              <button onClick={handleAddReport} disabled={uploading} className="btn btn-primary text-sm">
                {uploading ? "Adding..." : "Add Report"}
              </button>
            </div>
          )}

          {reports.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <p>No reports yet</p>
              <p className="text-sm mt-1">Reports and documents will appear here when added.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="bg-stone-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-stone-900">{report.title}</h3>
                      <p className="text-xs text-stone-500 mt-1">{report.date}</p>
                      {report.balance !== null && (
                        <p className="text-sm text-stone-600 mt-1">Balance: ${report.balance.toLocaleString()}</p>
                      )}
                      {report.notes && <p className="text-sm text-stone-600 mt-1">{report.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      {report.fileUrl ? (
                        <a href={report.fileUrl} className="text-sm text-amber-700 hover:underline">
                          {report.fileName}
                        </a>
                      ) : canEdit ? (
                        <label className="text-sm text-amber-700 hover:text-amber-800 cursor-pointer">
                          {uploadingReportId === report.id ? "Uploading..." : "Upload doc"}
                          <input
                            type="file"
                            className="hidden"
                            disabled={uploadingReportId === report.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(report.id, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Fine Schedule */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900">Fine Schedule</h2>
            {canEdit && (
              <button
                onClick={() => setShowEditFines(!showEditFines)}
                className="text-sm text-amber-700 hover:text-amber-800"
              >
                {showEditFines ? "Done" : "Edit"}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {fines.map((fine) => (
              <div key={fine.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-stone-900">{fine.name}</p>
                  <p className="text-xs text-stone-500">{fine.description}</p>
                </div>
                {showEditFines ? (
                  <input
                    type="number"
                    value={fine.amount}
                    onChange={(e) => handleUpdateFine(fine.id, parseInt(e.target.value) || 0)}
                    className="w-24 text-right text-sm"
                  />
                ) : (
                  <span className="font-medium text-stone-900">${fine.amount}</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="bg-stone-50 rounded-lg p-4 text-sm text-stone-600">
          <strong>Note:</strong> This treasurer module provides structure only. No payment processor is integrated.
          All payments should be coordinated directly with the Treasurer ({siteConfig.treasurerName}).
        </div>
      </div>
    </div>
  );
}
