"use client";
import { siteConfig } from "@/site.config";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { INITIAL_MEMBERS } from "@/lib/members-data";
import { prepareUploadFile } from "@/lib/prepare-upload-file";
import { AddressAutocomplete } from "@/components/address-autocomplete";

type TabType = "overview" | "attendees" | "logistics" | "agenda" | "rules";

interface RetreatAgenda {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  createdAt: string;
}

interface RetreatData {
  title: string;
  startDate: string;
  endDate: string;
  nightCount: string;
  location: string;
  venue: string;
  lodgingDetails: string;
  lodgingLink: string;
  estimatedCost: string;
  perPersonCost: string;
  depositAmount: string;
  planningNotes: string;
  dailySchedule: string;
  travelLogistics: string;
  mealsInfo: string;
  roomsInfo: string;
  packingList: string;
}

interface Attendee {
  memberId: string;
  name: string;
  status: "pending" | "in" | "out";
  hasPaid: boolean;
  paidAmount: number;
  notes: string;
}

type NotificationType = "success" | "error";

interface Notification {
  type: NotificationType;
  message: string;
}

const emptyRetreat: RetreatData = {
  title: "",
  startDate: "",
  endDate: "",
  nightCount: "",
  location: "",
  venue: "",
  lodgingDetails: "",
  lodgingLink: "",
  estimatedCost: "",
  perPersonCost: "",
  depositAmount: "",
  planningNotes: "",
  dailySchedule: "",
  travelLogistics: "",
  mealsInfo: "",
  roomsInfo: "",
  packingList: "",
};

function getGoogleMapsEmbedUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://www.google.com/maps?q=${encoded}&output=embed`;
}

export function RetreatClient() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agendas, setAgendas] = useState<RetreatAgenda[]>([]);
  const [uploadingAgenda, setUploadingAgenda] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [retreat, setRetreat] = useState<RetreatData>(emptyRetreat);

  const [attendees, setAttendees] = useState<Attendee[]>(
    INITIAL_MEMBERS.map((m) => ({
      memberId: m.id,
      name: m.name,
      status: "pending",
      hasPaid: false,
      paidAmount: 0,
      notes: "",
    }))
  );

  const showNotification = useCallback((type: NotificationType, message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  useEffect(() => {
    if (!isLoaded || !user) return;

    let cancelled = false;

    const fetchRetreatData = async () => {
      try {
        const response = await fetch("/api/retreat");
        if (response.ok && !cancelled) {
          const data = await response.json();
          if (data.retreat) {
            setRetreat(data.retreat);
          }
          if (data.attendees && data.attendees.length > 0) {
            const savedAttendeesByName = new Map<string, Attendee>();
            for (const att of data.attendees) {
              savedAttendeesByName.set(att.name.toLowerCase(), att);
            }
            setAttendees((prev) =>
              prev.map((att) => {
                const saved = savedAttendeesByName.get(att.name.toLowerCase());
                if (saved) {
                  return { ...att, ...saved };
                }
                return att;
              })
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch retreat data:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const fetchAgendas = async () => {
      try {
        const response = await fetch("/api/retreat/agendas");
        if (response.ok && !cancelled) {
          const data = await response.json();
          setAgendas(data.agendas || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch retreat agendas:", error);
        }
      }
    };

    fetchRetreatData();
    fetchAgendas();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  const handleAgendaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showNotification("error", "Please upload a PDF or image file");
      return;
    }

    setUploadingAgenda(true);
    try {
      const prepared = await prepareUploadFile(file);
      const formData = new FormData();
      formData.append("file", prepared);

      const response = await fetch("/api/retreat/agendas", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAgendas((prev) => [data.agenda, ...prev]);
        showNotification("success", "Agenda uploaded successfully");
      } else {
        const data = await response.json().catch(() => null);
        showNotification("error", data?.error || "Failed to upload agenda");
      }
    } catch (error) {
      console.error("Agenda upload error:", error);
      showNotification("error", "Failed to upload agenda. Please try again.");
    } finally {
      setUploadingAgenda(false);
      e.target.value = "";
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "attendees", label: "Attendees" },
    { id: "logistics", label: "Logistics" },
    { id: "agenda", label: "Agenda" },
    { id: "rules", label: "Constitution Rules" },
  ];

  const updateAttendee = (memberId: string, field: keyof Attendee, value: string | boolean | number) => {
    setAttendees(
      attendees.map((a) =>
        a.memberId === memberId ? { ...a, [field]: value } : a
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/retreat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retreat, attendees }),
      });
      if (response.ok) {
        showNotification("success", "Retreat saved successfully");
      } else {
        const data = await response.json().catch(() => null);
        const errorMsg = data?.error || "Failed to save retreat. Please try again.";
        showNotification("error", errorMsg);
      }
    } catch (error) {
      console.error("Save retreat error:", error);
      showNotification("error", "Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const totalPaid = attendees.filter((a) => a.hasPaid).reduce((sum, a) => sum + a.paidAmount, 0);
  const confirmedCount = attendees.filter((a) => a.status === "in").length;

  const mapAddress = retreat.venue && retreat.location
    ? `${retreat.venue}, ${retreat.location}`
    : retreat.location || retreat.venue;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-stone-500">Loading retreat data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between ${
            notification.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      <div className="card p-1.5 flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="card">
          <div className="p-4 border-b border-stone-200">
            <h2 className="font-semibold text-stone-900">Retreat Details</h2>
            <p className="text-sm text-stone-500">Coordinator: {siteConfig.retreatCoordinatorName}</p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Retreat Title
              </label>
              <input
                type="text"
                value={retreat.title}
                onChange={(e) => setRetreat({ ...retreat, title: e.target.value })}
                className="w-full"
                placeholder="e.g., Annual Forum Retreat 2027"
              />
            </div>
            
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={retreat.startDate}
                  onChange={(e) => setRetreat({ ...retreat, startDate: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={retreat.endDate}
                  onChange={(e) => setRetreat({ ...retreat, endDate: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Night Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={retreat.nightCount}
                  onChange={(e) => setRetreat({ ...retreat, nightCount: e.target.value })}
                  className="w-full"
                  placeholder="1-5"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Location / Address
                </label>
                <AddressAutocomplete
                  value={retreat.location}
                  onChange={(location) => setRetreat({ ...retreat, location })}
                  placeholder="Address or city, state"
                  className="w-full border-stone-300 focus:ring-stone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Venue
                </label>
                <input
                  type="text"
                  value={retreat.venue}
                  onChange={(e) => setRetreat({ ...retreat, venue: e.target.value })}
                  className="w-full"
                  placeholder="Venue name"
                />
              </div>
            </div>

            {mapAddress && (
              <div className="rounded-lg overflow-hidden border border-stone-200">
                <iframe
                  src={getGoogleMapsEmbedUrl(mapAddress)}
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Retreat location"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Lodging Details
              </label>
              <textarea
                value={retreat.lodgingDetails}
                onChange={(e) => setRetreat({ ...retreat, lodgingDetails: e.target.value })}
                rows={2}
                className="w-full"
                placeholder="Room types, amenities, check-in/out times..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Lodging Link (optional)
              </label>
              <input
                type="url"
                value={retreat.lodgingLink}
                onChange={(e) => setRetreat({ ...retreat, lodgingLink: e.target.value })}
                className="w-full"
                placeholder="https://..."
              />
            </div>

            <div className="pt-4 border-t border-stone-200">
              <h3 className="font-medium text-stone-900 mb-3">Budget</h3>
              <p className="text-sm text-stone-500 mb-3">Constitution limit: $X per member (set in your constitution)</p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Estimated Total Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-stone-500">$</span>
                    <input
                      type="number"
                      value={retreat.estimatedCost}
                      onChange={(e) => setRetreat({ ...retreat, estimatedCost: e.target.value })}
                      className="w-full pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Per Person Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-stone-500">$</span>
                    <input
                      type="number"
                      value={retreat.perPersonCost}
                      onChange={(e) => setRetreat({ ...retreat, perPersonCost: e.target.value })}
                      className="w-full pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Deposit Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-stone-500">$</span>
                    <input
                      type="number"
                      value={retreat.depositAmount}
                      onChange={(e) => setRetreat({ ...retreat, depositAmount: e.target.value })}
                      className="w-full pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              <p className="text-sm text-stone-600 mt-3">
                Total collected: <span className="font-medium">${totalPaid.toLocaleString()}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Planning Notes
              </label>
              <textarea
                value={retreat.planningNotes}
                onChange={(e) => setRetreat({ ...retreat, planningNotes: e.target.value })}
                rows={4}
                className="w-full"
                placeholder="Shared planning notes..."
              />
            </div>
          </div>
          <div className="p-4 border-t border-stone-200 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? "Saving..." : "Save Retreat"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "attendees" && (
        <div className="card">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-stone-900">Attendees</h2>
              <p className="text-sm text-stone-500">
                {confirmedCount} confirmed of {attendees.length} members
              </p>
            </div>
          </div>
          <div className="divide-y divide-stone-200">
            {attendees.map((attendee) => (
              <div key={attendee.memberId} className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="font-medium text-stone-900">{attendee.name}</div>
                  <div className="flex items-center gap-3">
                    <select
                      value={attendee.status}
                      onChange={(e) =>
                        updateAttendee(attendee.memberId, "status", e.target.value)
                      }
                      className="text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="in">In</option>
                      <option value="out">Out</option>
                    </select>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={attendee.hasPaid}
                        onChange={(e) =>
                          updateAttendee(attendee.memberId, "hasPaid", e.target.checked)
                        }
                        className="mr-2"
                      />
                      Paid
                    </label>
                    {attendee.hasPaid && (
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-stone-500 text-sm">$</span>
                        <input
                          type="number"
                          value={attendee.paidAmount || ""}
                          onChange={(e) =>
                            updateAttendee(attendee.memberId, "paidAmount", Number(e.target.value))
                          }
                          className="w-24 pl-6 text-sm"
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>
                </div>
                {attendee.status === "out" && (
                  <p className="text-xs text-amber-700 mt-2">
                    Status held to forum review per constitution
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "logistics" && (
        <div className="card">
          <div className="p-4 border-b border-stone-200">
            <h2 className="font-semibold text-stone-900">Logistics</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Travel
              </label>
              <textarea
                value={retreat.travelLogistics}
                onChange={(e) => setRetreat({ ...retreat, travelLogistics: e.target.value })}
                rows={3}
                className="w-full"
                placeholder="Flight info, carpooling, directions..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Meals
              </label>
              <textarea
                value={retreat.mealsInfo}
                onChange={(e) => setRetreat({ ...retreat, mealsInfo: e.target.value })}
                rows={3}
                className="w-full"
                placeholder="Meal plans, dietary needs, restaurants..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Rooms
              </label>
              <textarea
                value={retreat.roomsInfo}
                onChange={(e) => setRetreat({ ...retreat, roomsInfo: e.target.value })}
                rows={3}
                className="w-full"
                placeholder="Room assignments, roommates..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Packing List
              </label>
              <textarea
                value={retreat.packingList}
                onChange={(e) => setRetreat({ ...retreat, packingList: e.target.value })}
                rows={4}
                className="w-full"
                placeholder="What to bring..."
              />
            </div>
          </div>
          <div className="p-4 border-t border-stone-200 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? "Saving..." : "Save Logistics"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "agenda" && (
        <div className="card">
          <div className="p-4 border-b border-stone-200">
            <h2 className="font-semibold text-stone-900">Daily Schedule / Agenda</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Schedule Notes
              </label>
              <textarea
                value={retreat.dailySchedule}
                onChange={(e) => setRetreat({ ...retreat, dailySchedule: e.target.value })}
                rows={10}
                className="w-full"
                placeholder="Day-by-day schedule..."
              />
            </div>
            <div className="bg-stone-50 rounded p-4">
              <h3 className="font-medium text-stone-900 mb-2">Upload Agenda Document</h3>
              <label className="btn btn-primary text-sm cursor-pointer inline-block">
                {uploadingAgenda ? "Uploading..." : "Upload Agenda"}
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  disabled={uploadingAgenda}
                  onChange={handleAgendaUpload}
                />
              </label>
              <p className="text-xs text-stone-500 mt-1">PDF or image</p>
              {agendas.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-stone-700">Uploaded Agendas:</p>
                  {agendas.map((agenda) => (
                    <div key={agenda.id} className="flex items-center justify-between bg-white rounded p-2">
                      <a
                        href={agenda.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-amber-700 hover:underline"
                      >
                        {agenda.fileName} →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-stone-200 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? "Saving..." : "Save Agenda"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="card">
          <div className="p-4 border-b border-stone-200">
            <h2 className="font-semibold text-stone-900">Constitution Rules for Retreat</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-stone-50 rounded p-4">
              <h3 className="font-medium text-stone-900 mb-2">Planning Timeline</h3>
              <ul className="text-sm text-stone-600 space-y-1">
                <li>• Set dates <strong>6 months</strong> out</li>
                <li>• Finalize details <strong>45 days</strong> before retreat</li>
              </ul>
            </div>

            <div className="bg-stone-50 rounded p-4">
              <h3 className="font-medium text-stone-900 mb-2">Budget</h3>
              <p className="text-sm text-stone-600">
                Maximum <strong>$X per member (set in your constitution)</strong>
              </p>
            </div>

            <div className="bg-stone-50 rounded p-4">
              <h3 className="font-medium text-stone-900 mb-2">Attendance</h3>
              <p className="text-sm text-stone-600">
                Retreat is <strong>mandatory</strong> per constitution. Members who cannot attend 
                will have their status held to forum review.
              </p>
            </div>

            <div className="bg-red-50 rounded p-4 border border-red-200">
              <h3 className="font-medium text-red-900 mb-2">Prohibited Activities</h3>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• No illegal drugs</li>
                <li>• No skydiving</li>
                <li>• No camping without plumbing</li>
                <li>• No Fear Factor eating</li>
                <li>• No confined spaces</li>
              </ul>
            </div>

            <div className="bg-stone-50 rounded p-4">
              <h3 className="font-medium text-stone-900 mb-2">Coordinators</h3>
              <p className="text-sm text-stone-600">
                <strong>{siteConfig.retreatCoordinatorName}</strong> (Retreat role)
                
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
