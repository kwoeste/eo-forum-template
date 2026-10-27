"use client";
import { siteConfig, isEmail } from "@/site.config";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { filterMyOpenGoals } from "@/lib/goals-data";
import { prepareUploadFile } from "@/lib/prepare-upload-file";
import { useGoals } from "@/lib/use-goals";
import { ConstitutionStatusCard } from "./constitution-status";

interface MeetingPrepItem {
  id: string;
  title: string;
  href: string | null;
  note: string | null;
  sortOrder: number;
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
}

interface PrepItemFormData {
  title: string;
  href: string;
  note: string;
  dueDate: string;
}

interface NextMeeting {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  agendaUrl: string | null;
  agendaFileName: string | null;
}

interface ParkingLotItem {
  id: string;
  memberName: string | null;
  categoryName: string;
  date: string | null;
  noteText: string;
  isHighlighted: boolean;
  status: string;
}

const DEFAULT_MEETING: NextMeeting = {
  title: "Forum Meeting",
  date: "",
  startTime: "12:00",
  endTime: "16:30",
  location: null,
  agendaUrl: null,
  agendaFileName: null,
};

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const { goals, currentMember, userEmails } = useGoals();
  const [meeting, setMeeting] = useState<NextMeeting>(DEFAULT_MEETING);
  const [meetingLoaded, setMeetingLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prepItems, setPrepItems] = useState<MeetingPrepItem[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [parkingLotItems, setParkingLotItems] = useState<ParkingLotItem[]>([]);
  const [parkingLotLoading, setParkingLotLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MeetingPrepItem | null>(null);
  const [formData, setFormData] = useState<PrepItemFormData>({
    title: "",
    href: "",
    note: "",
    dueDate: DEFAULT_MEETING.date,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isAdmin = user?.emailAddresses?.some(
    (email) => isEmail(email.emailAddress, siteConfig.adminEmail)
  );

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    let cancelled = false;

    const fetchNextMeeting = async () => {
      try {
        const response = await fetch("/api/events?upcoming=true&type=forum");
        if (response.ok && !cancelled) {
          const data = await response.json();
          const forumEvents = (data.events || []).filter((e: { eventType: string }) => e.eventType === "forum");
          if (forumEvents.length > 0) {
            const nextEvent = forumEvents[0];
            setMeeting((prev) => ({
              ...prev,
              title: nextEvent.title || "Forum Meeting",
              date: nextEvent.eventDate,
              startTime: nextEvent.startTime || "12:00",
              endTime: nextEvent.endTime || "16:30",
              location: nextEvent.location,
            }));
            setFormData((prev) => ({
              ...prev,
              dueDate: nextEvent.eventDate,
            }));
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch next meeting:", error);
        }
      } finally {
        if (!cancelled) {
          setMeetingLoaded(true);
        }
      }
    };

    const fetchPrepItems = async () => {
      try {
        const response = await fetch("/api/meeting-prep");
        if (response.ok && !cancelled) {
          const data = await response.json();
          setPrepItems(data.items || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch meeting prep items:", error);
        }
      }
    };

    const fetchParkingLot = async () => {
      try {
        const response = await fetch("/api/parking-lot");
        if (response.ok && !cancelled) {
          const data = await response.json();
          setParkingLotItems(data.items || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch parking lot items:", error);
        }
      } finally {
        if (!cancelled) {
          setParkingLotLoading(false);
        }
      }
    };

    fetchNextMeeting();
    fetchPrepItems();
    fetchParkingLot();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  useEffect(() => {
    if (!meetingLoaded || !meeting.date) return;
    
    let cancelled = false;
    const fetchAgenda = async () => {
      try {
        const response = await fetch(`/api/agendas?meetingDate=${meeting.date}`);
        if (response.ok && !cancelled) {
          const data = await response.json();
          if (data.agenda) {
            setMeeting((prev) => ({
              ...prev,
              agendaUrl: data.agenda.fileUrl,
              agendaFileName: data.agenda.fileName,
            }));
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch agenda:", error);
        }
      }
    };
    
    fetchAgenda();
    
    return () => {
      cancelled = true;
    };
  }, [meetingLoaded, meeting.date]);

  const toggleComplete = async (itemId: string, currentlyCompleted: boolean) => {
    setTogglingId(itemId);
    try {
      const action = currentlyCompleted ? "uncomplete" : "complete";
      const response = await fetch(`/api/meeting-prep/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        setPrepItems((items) =>
          items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  completed: !currentlyCompleted,
                  completedAt: !currentlyCompleted ? new Date().toISOString() : null,
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle completion:", error);
    } finally {
      setTogglingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      href: "",
      note: "",
      dueDate: meeting.date,
    });
    setShowAddForm(false);
    setEditingItem(null);
  };

  const handleAddClick = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      href: "",
      note: "",
      dueDate: meeting.date,
    });
    setShowAddForm(true);
  };

  const handleEditClick = (item: MeetingPrepItem) => {
    setShowAddForm(false);
    setEditingItem(item);
    setFormData({
      title: item.title,
      href: item.href || "",
      note: item.note || "",
      dueDate: item.dueDate,
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.dueDate) return;

    setFormSubmitting(true);
    try {
      if (editingItem) {
        const response = await fetch(`/api/meeting-prep/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title.trim(),
            href: formData.href.trim() || null,
            note: formData.note.trim() || null,
            dueDate: formData.dueDate,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setPrepItems((items) =>
            items.map((item) =>
              item.id === editingItem.id
                ? { ...item, ...data.item }
                : item
            )
          );
          resetForm();
        }
      } else {
        const response = await fetch("/api/meeting-prep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title.trim(),
            href: formData.href.trim() || null,
            note: formData.note.trim() || null,
            dueDate: formData.dueDate,
            sortOrder: prepItems.length,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setPrepItems((items) => [
            ...items,
            { ...data.item, completed: false, completedAt: null },
          ]);
          resetForm();
        }
      }
    } catch (error) {
      console.error("Failed to save prep item:", error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Delete this prep item?")) return;
    
    setDeletingId(itemId);
    try {
      const response = await fetch(`/api/meeting-prep/${itemId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setPrepItems((items) => items.filter((item) => item.id !== itemId));
        if (editingItem?.id === itemId) {
          resetForm();
        }
      }
    } catch (error) {
      console.error("Failed to delete prep item:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatPrepDueDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getMeetingPrepTitle = () => {
    const date = new Date(meeting.date + "T00:00:00");
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    return `Before ${month} ${day}`;
  };
  const isModerator = user?.emailAddresses?.some(
    (email) => isEmail(email.emailAddress, siteConfig.moderatorEmail)
  );
  const canUploadAgenda = isAdmin || isModerator;

  const myGoals = filterMyOpenGoals(goals, currentMember, userEmails, user?.fullName);

  const parkingLotHighlights = useMemo(() => {
    const activeItems = parkingLotItems.filter((item) => item.status === "active");
    const highlighted = activeItems.filter((item) => item.isHighlighted);
    
    if (highlighted.length > 0) {
      return { items: highlighted.slice(0, 5), isHighlightedOnly: true };
    }
    
    const importantItems = activeItems.filter((item) =>
      item.categoryName === "Important Urgent" || item.categoryName === "Important"
    );
    if (importantItems.length > 0) {
      return { items: importantItems.slice(0, 5), isHighlightedOnly: false };
    }
    
    return { items: activeItems.slice(0, 5), isHighlightedOnly: false };
  }, [parkingLotItems]);

  const formatParkingLotDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const horizonLabel = (horizon: number) => {
    const labels: Record<number, string> = {
      1: "1 mo",
      3: "3 mo",
      6: "6 mo",
      12: "12 mo",
    };
    return labels[horizon] ?? `${horizon} mo`;
  };

  const formatGoalDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getGoogleMapsEmbedUrl = (address: string) => {
    const encoded = encodeURIComponent(address);
    return `https://www.google.com/maps?q=${encoded}&output=embed`;
  };

  const handleAgendaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or image file");
      return;
    }

    setUploading(true);
    try {
      const prepared = await prepareUploadFile(file);
      const formData = new FormData();
      formData.append("file", prepared);
      formData.append("meetingDate", meeting.date);

      const response = await fetch("/api/agendas/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMeeting({
          ...meeting,
          agendaUrl: data.fileUrl,
          agendaFileName: data.fileName,
        });
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to upload agenda");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload agenda");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">{siteConfig.forumName}</h1>
        <p className="text-stone-500 mt-1">Nothing, no one, ever.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Pre-Meeting Checklist */}
          {user && (prepItems.length > 0 || isAdmin) && (
            <section className="card">
              <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                <h2 className="font-semibold text-stone-900">{getMeetingPrepTitle()}</h2>
                <div className="flex items-center gap-3">
                  {prepItems.length > 0 && (
                    <span className="text-xs text-stone-500">
                      {prepItems.filter((i) => i.completed).length}/{prepItems.length} complete
                    </span>
                  )}
                  {isAdmin && !showAddForm && !editingItem && (
                    <button
                      onClick={handleAddClick}
                      className="text-xs text-amber-700 hover:text-amber-800 font-medium"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4">
                {/* Add/Edit Form for Admin */}
                {isAdmin && (showAddForm || editingItem) && (
                  <form ref={formRef} onSubmit={handleFormSubmit} className="mb-4 pb-4 border-b border-stone-200">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Complete 5% Reflection"
                          className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          required
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">
                            Link (optional)
                          </label>
                          <input
                            type="text"
                            value={formData.href}
                            onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                            placeholder="/five-percent"
                            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Note (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.note}
                          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                          placeholder="Additional instructions..."
                          className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={resetForm}
                          className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={formSubmitting || !formData.title.trim()}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md disabled:opacity-50"
                        >
                          {formSubmitting ? "Saving..." : editingItem ? "Save Changes" : "Add Item"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
                
                {prepItems.length === 0 && !showAddForm ? (
                  <p className="text-sm text-stone-500 text-center py-4">
                    No prep items yet.{" "}
                    {isAdmin && (
                      <button
                        onClick={handleAddClick}
                        className="text-amber-700 hover:underline"
                      >
                        Add the first item
                      </button>
                    )}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {prepItems.map((item) => (
                      <li
                        key={item.id}
                        className={`flex items-start gap-3 ${editingItem?.id === item.id ? "bg-amber-50 -mx-2 px-2 py-2 rounded-md" : ""}`}
                      >
                        <button
                          onClick={() => toggleComplete(item.id, item.completed)}
                          disabled={togglingId === item.id}
                          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            item.completed
                              ? "bg-green-600 border-green-600 text-white"
                              : "border-stone-300 hover:border-amber-600"
                          } ${togglingId === item.id ? "opacity-50" : ""}`}
                          aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
                        >
                          {item.completed && (
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.href ? (
                              <Link
                                href={item.href}
                                className={`text-sm hover:text-amber-700 ${
                                  item.completed ? "text-stone-400 line-through" : "text-stone-900"
                                }`}
                              >
                                {item.title}
                              </Link>
                            ) : (
                              <span
                                className={`text-sm ${
                                  item.completed ? "text-stone-400 line-through" : "text-stone-900"
                                }`}
                              >
                                {item.title}
                              </span>
                            )}
                            {item.dueDate !== meeting.date && (
                              <span className="text-xs text-stone-400">
                                due {formatPrepDueDate(item.dueDate)}
                              </span>
                            )}
                          </div>
                          {item.note && (
                            <p className="text-xs text-stone-500 mt-0.5">{item.note}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleEditClick(item)}
                                disabled={deletingId === item.id}
                                className="text-xs px-2 py-1 text-stone-500 hover:text-stone-700 rounded transition-colors"
                                title="Edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                                className="text-xs px-2 py-1 text-red-500 hover:text-red-700 rounded transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                {deletingId === item.id ? "..." : "×"}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => toggleComplete(item.id, item.completed)}
                            disabled={togglingId === item.id}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              item.completed
                                ? "text-stone-500 hover:text-stone-700"
                                : "text-amber-700 hover:bg-amber-50"
                            } ${togglingId === item.id ? "opacity-50" : ""}`}
                          >
                            {togglingId === item.id
                              ? "..."
                              : item.completed
                              ? "Undo"
                              : "Complete"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* Next Meeting Card with Map */}
          <section className="card overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-stone-900">Next Forum Meeting</h2>
                <Link href="/calendar" className="text-sm text-amber-700 hover:text-amber-800">
                  View calendar →
                </Link>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-semibold text-stone-900">{formatDate(meeting.date)}</span>
              </div>
              <p className="text-stone-600 mt-1">
                {formatTime(meeting.startTime)} – {formatTime(meeting.endTime)} ET
              </p>
              {meeting.location && (
                <p className="text-sm text-stone-500 mt-1">{meeting.location}</p>
              )}

              {/* Agenda Section */}
              <div className="mt-4 pt-4 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700">Agenda</span>
                  {canUploadAgenda && (
                    <label className="text-sm text-amber-700 hover:text-amber-800 cursor-pointer">
                      {uploading ? "Uploading..." : meeting.agendaUrl ? "Replace" : "Upload"}
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleAgendaUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
                {meeting.agendaUrl ? (
                  <a
                    href={meeting.agendaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-amber-700 hover:underline mt-1 inline-block"
                  >
                    {meeting.agendaFileName || "View agenda"} →
                  </a>
                ) : (
                  <p className="text-sm text-stone-400 mt-1">No agenda uploaded yet</p>
                )}
                <Link href="/library" className="text-sm text-stone-500 hover:text-stone-700 mt-2 inline-block">
                  View all agendas in Library →
                </Link>
              </div>
            </div>

            {/* Google Maps Embed */}
            {meeting.location && (
              <div className="border-t border-stone-200">
                <iframe
                  src={getGoogleMapsEmbedUrl(meeting.location)}
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Meeting location"
                />
              </div>
            )}
          </section>

          <section className="card">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">My Goals</h2>
              <Link href="/goals" className="text-sm text-amber-700 hover:text-amber-800">
                All goals →
              </Link>
            </div>
            <div className="p-4">
              {!user ? (
                <div className="text-center py-6 text-stone-500 text-sm">Loading goals…</div>
              ) : myGoals.length === 0 ? (
                <div className="text-center py-6 text-stone-500 text-sm">
                  No goals yet. <Link href="/goals" className="text-amber-700 hover:underline">Add your first goal</Link>
                </div>
              ) : (
                <ul className="divide-y divide-stone-200">
                  {myGoals.map((goal) => (
                    <li key={goal.id} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-stone-900 text-sm">{goal.goalText}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-stone-500">
                        <span className="badge badge-muted">{horizonLabel(goal.horizon)}</span>
                        {goal.month && <span className="badge badge-muted">{goal.month}</span>}
                        <span>Target {formatGoalDate(goal.targetDate)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="card">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">Parking Lot Highlights</h2>
              <Link href="/parking-lot" className="text-sm text-amber-700 hover:text-amber-800">
                View all →
              </Link>
            </div>
            <div className="p-4">
              {parkingLotLoading ? (
                <div className="text-center py-6 text-stone-500 text-sm">Loading...</div>
              ) : parkingLotHighlights.items.length === 0 ? (
                <div className="text-center py-6 text-stone-500 text-sm">
                  <p>No items in the parking lot</p>
                  <Link href="/parking-lot" className="text-amber-700 hover:underline mt-2 inline-block">
                    Add items on the Parking Lot page
                  </Link>
                </div>
              ) : (
                <>
                  {!parkingLotHighlights.isHighlightedOnly && (
                    <p className="text-xs text-stone-400 mb-3">
                      No highlighted items — showing recent important topics
                    </p>
                  )}
                  <ul className="space-y-3">
                    {parkingLotHighlights.items.map((item) => (
                      <li key={item.id} className="border-l-2 border-amber-400 pl-3">
                        <p className="text-sm text-stone-900">{item.noteText}</p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-stone-500">
                          <span className="badge badge-muted">{item.categoryName}</span>
                          {item.memberName && <span>{item.memberName}</span>}
                          {item.date && <span>{formatParkingLotDate(item.date)}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold text-stone-900 mb-4">How We Meet</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wider mb-1">Schedule</p>
                <p className="text-stone-900">2nd Thursday, 12:00–4:30 PM ET</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wider mb-1">Confidentiality</p>
                <p className="text-stone-900 italic">"Nothing, no one, ever."</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-200">
              <p className="text-stone-500 text-xs uppercase tracking-wider mb-2">Rituals</p>
              <div className="grid sm:grid-cols-2 gap-2 text-sm text-stone-700">
                <span>• 5% Check-In</span>
                <span>• Deep Dive</span>
                <span>• Parking Lot Review</span>
                <span>• Goal Review</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-200">
              <p className="text-stone-500 text-xs uppercase tracking-wider mb-2">Deep Dive Rules</p>
              <p className="text-sm text-stone-700">Coaching meeting must happen ≥1 week before forum</p>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-200">
              <p className="text-stone-500 text-xs uppercase tracking-wider mb-2">Fines</p>
              <div className="text-sm text-stone-700 space-y-1">
                <p>See the fine schedule in your constitution</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-semibold text-stone-900 mb-3">Core Values</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-stone-900">Respect</p>
                <p className="text-stone-500">Honor each other's perspectives</p>
              </div>
              <div>
                <p className="font-medium text-stone-900">All In</p>
                <p className="text-stone-500">Full commitment to forum</p>
              </div>
              <div>
                <p className="font-medium text-stone-900">Own It</p>
                <p className="text-stone-500">Take responsibility</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-200">
              <p className="text-xs text-stone-500 uppercase tracking-wider">Vision</p>
              <p className="font-medium text-stone-900">Grow Together.</p>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold text-stone-900 mb-3">My 5% Reflections</h2>
            <div className="text-center py-4 text-stone-500 text-sm">
              <p>Private to you only</p>
              <Link href="/five-percent" className="text-amber-700 hover:underline mt-2 inline-block">
                Start reflection →
              </Link>
            </div>
          </section>

          <ConstitutionStatusCard />

          <section className="card p-5">
            <h2 className="font-semibold text-stone-900 mb-3">Quick Links</h2>
            <div className="space-y-2">
              <Link href="/five-percent" className="block text-sm text-stone-700 hover:text-amber-700">
                5% Reflection
              </Link>
              <Link href="/deep-dive" className="block text-sm text-stone-700 hover:text-amber-700">
                Deep Dive
              </Link>
              <Link href="/parking-lot" className="block text-sm text-stone-700 hover:text-amber-700">
                Parking Lot
              </Link>
              <Link href="/goals" className="block text-sm text-stone-700 hover:text-amber-700">
                Goals
              </Link>
              <Link href="/retreat" className="block text-sm text-stone-700 hover:text-amber-700">
                Retreat
              </Link>
              <Link href="/treasurer" className="block text-sm text-stone-700 hover:text-amber-700">
                Treasurer
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
