"use client";
import { siteConfig, isEmail } from "@/site.config";

import { useMemo, useState, useEffect } from "react";
import {
  formatMeetingDate,
  formatTime,
  getEventTypeColor,
  getEventTypeLabel,
} from "@/lib/calendar-data";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import type { Meeting } from "@/lib/calendar-data";
import { toBirthdayCalendarEvents, type BirthdayMember } from "@/lib/birthdays";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";

type ViewMode = "list" | "calendar";

interface CalendarClientProps {
  birthdayMembers: BirthdayMember[];
}

interface DBEvent {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  eventType: string;
}

interface ExtendedDBEvent extends DBEvent {
  endDate: string | null;
}

export function CalendarClient({ birthdayMembers }: CalendarClientProps) {
  const [events, setEvents] = useState<Meeting[]>([]);
  const [dbEvents, setDbEvents] = useState<ExtendedDBEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8, 1));
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExtendedDBEvent | null>(null);
  const [editFormSubmitting, setEditFormSubmitting] = useState(false);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<ExtendedDBEvent | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    location: "",
    eventType: "general",
  });
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    startTime: "12:00",
    endTime: "16:30",
    location: "",
    eventType: "general",
  });

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events");
      if (response.ok) {
        const data = await response.json();
        const rawEvents: ExtendedDBEvent[] = data.events || [];
        setDbEvents(rawEvents);
        const mappedEvents: Meeting[] = rawEvents.map((e: ExtendedDBEvent) => ({
          id: e.id,
          title: e.title,
          date: e.eventDate,
          startTime: e.startTime || "12:00",
          endTime: e.endTime || "16:30",
          location: e.location,
          eventType: (e.eventType as Meeting["eventType"]) || "general",
        }));
        setEvents(mappedEvents);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const allEvents = useMemo(() => {
    const years = new Set<number>([
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      currentMonth.getFullYear(),
    ]);
    for (const event of events) {
      years.add(Number(event.date.slice(0, 4)));
    }
    return [...events, ...toBirthdayCalendarEvents(birthdayMembers, [...years])];
  }, [birthdayMembers, currentMonth, events]);

  const now = new Date();
  const upcomingEvents = allEvents.filter(
    (e) => new Date(e.date + "T23:59:59") >= now
  ).sort((a, b) => a.date.localeCompare(b.date));

  const nextMeeting = upcomingEvents.find((e) => e.eventType === "forum");

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      alert("Please fill in title and date");
      return;
    }
    
    setFormSubmitting(true);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEvent.title,
          eventDate: newEvent.date,
          startTime: newEvent.startTime || null,
          endTime: newEvent.endTime || null,
          location: newEvent.location || null,
          eventType: newEvent.eventType,
        }),
      });

      if (response.ok) {
        setNewEvent({ title: "", date: "", startTime: "12:00", endTime: "16:30", location: "", eventType: "general" });
        setShowAddEvent(false);
        fetchEvents();
      } else {
        const errData = await response.json();
        alert(errData.error || "Failed to add event");
      }
    } catch (error) {
      console.error("Failed to add event:", error);
      alert("Failed to add event");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenEdit = (eventId: string) => {
    const dbEvent = dbEvents.find((e) => e.id === eventId);
    if (!dbEvent) return;
    setEditForm({
      title: dbEvent.title,
      description: dbEvent.description || "",
      eventDate: dbEvent.eventDate,
      endDate: dbEvent.endDate || "",
      startTime: dbEvent.startTime || "",
      endTime: dbEvent.endTime || "",
      location: dbEvent.location || "",
      eventType: dbEvent.eventType,
    });
    setEditingEvent(dbEvent);
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!editForm.title || !editForm.eventDate) {
      alert("Please fill in title and date");
      return;
    }

    setEditFormSubmitting(true);
    try {
      const response = await fetch(`/api/events/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          eventDate: editForm.eventDate,
          endDate: editForm.endDate || null,
          startTime: editForm.startTime || null,
          endTime: editForm.endTime || null,
          location: editForm.location || null,
          eventType: editForm.eventType,
        }),
      });

      if (response.ok) {
        setEditingEvent(null);
        fetchEvents();
      } else {
        const errData = await response.json();
        alert(errData.error || "Failed to update event");
      }
    } catch (err) {
      console.error("Error updating event:", err);
      alert("Failed to update event");
    } finally {
      setEditFormSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteConfirmEvent) return;

    setDeleteSubmitting(true);
    try {
      const response = await fetch(`/api/events/${deleteConfirmEvent.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteConfirmEvent(null);
        fetchEvents();
      } else {
        const errData = await response.json();
        alert(errData.error || "Failed to delete event");
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleOpenDelete = (eventId: string) => {
    const dbEvent = dbEvents.find((e) => e.id === eventId);
    if (dbEvent) {
      setDeleteConfirmEvent(dbEvent);
    }
  };

  const downloadICS = () => {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//${siteConfig.forumName}//Forum Calendar//EN`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const event of allEvents) {
      const dateStr = event.date.replace(/-/g, "");
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${event.id}@${siteConfig.domain}`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
      if (event.eventType === "birthday") {
        const nextDay = new Date(`${event.date}T12:00:00`);
        nextDay.setDate(nextDay.getDate() + 1);
        const endDateStr = format(nextDay, "yyyyMMdd");
        lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
        lines.push(`DTEND;VALUE=DATE:${endDateStr}`);
      } else {
        const startTime = event.startTime.replace(":", "") + "00";
        const endTime = event.endTime.replace(":", "") + "00";
        lines.push(`DTSTART;TZID=America/New_York:${dateStr}T${startTime}`);
        lines.push(`DTEND;TZID=America/New_York:${dateStr}T${endTime}`);
      }
      lines.push(`SUMMARY:${event.title}`);
      if (event.location) {
        lines.push(`LOCATION:${event.location}`);
      }
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "forum-calendar.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const getEventsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return allEvents.filter((e) => e.date === dateStr);
  };

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-500">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded text-sm font-medium ${
              viewMode === "list" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 rounded text-sm font-medium ${
              viewMode === "calendar" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            Calendar
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadICS} className="btn btn-ghost text-sm">
            Download ICS
          </button>
          <button
            onClick={() => setShowAddEvent(!showAddEvent)}
            className="btn btn-primary text-sm"
          >
            {showAddEvent ? "Cancel" : "Add Event"}
          </button>
        </div>
      </div>

      {/* Add Event Form */}
      {showAddEvent && (
        <div className="card p-4">
          <h3 className="font-semibold text-stone-900 mb-4">Add Event</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full"
                placeholder="Event title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Start Time</label>
              <input
                type="time"
                value={newEvent.startTime}
                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">End Time</label>
              <input
                type="time"
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Event Type</label>
              <select
                value={newEvent.eventType}
                onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value })}
                className="w-full"
              >
                <option value="general">General</option>
                <option value="forum">Forum</option>
                <option value="chapter">Chapter</option>
                <option value="social">Social</option>
                <option value="retreat">Retreat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
              <AddressAutocomplete
                value={newEvent.location}
                onChange={(location) => setNewEvent({ ...newEvent, location })}
                placeholder="e.g. 123 Main St"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            The address will be used for the map on the home page when this event is next.
          </p>
          <button 
            onClick={handleAddEvent} 
            disabled={formSubmitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {formSubmitting ? "Adding..." : "Add Event"}
          </button>
        </div>
      )}

      {/* Next Meeting Card */}
      {nextMeeting && viewMode === "list" && (
        <div className="card p-6 bg-amber-50 border-amber-200">
          <p className="text-xs text-amber-600 uppercase tracking-wide font-medium mb-1">Next Forum Meeting</p>
          <h2 className="text-xl font-bold text-stone-900 mb-1">{formatMeetingDate(nextMeeting.date)}</h2>
          <p className="text-stone-600">
            {formatTime(nextMeeting.startTime)} – {formatTime(nextMeeting.endTime)} ET
          </p>
          {nextMeeting.location && (
            <p className="text-stone-500 mt-1 text-sm">{nextMeeting.location}</p>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="card">
          <div className="p-4 border-b border-stone-200">
            <h2 className="font-semibold text-stone-900">Upcoming Events</h2>
          </div>
          <div className="divide-y divide-stone-200">
            {upcomingEvents.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                No upcoming events. Add one above!
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div key={event.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-stone-900">{event.title}</h3>
                      <p className="text-sm text-stone-600 mt-1">
                        {event.eventType === "birthday"
                          ? formatMeetingDate(event.date)
                          : `${formatMeetingDate(event.date)} • ${formatTime(event.startTime)} – ${formatTime(event.endTime)} ET`}
                      </p>
                      {event.location && (
                        <p className="text-sm text-stone-500 mt-1">{event.location}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getEventTypeColor(event.eventType)}`}>
                        {getEventTypeLabel(event.eventType)}
                      </span>
                      {event.eventType !== "birthday" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenEdit(event.id)}
                            className="text-xs px-2 py-1 bg-stone-100 text-stone-700 rounded-full hover:bg-stone-200 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleOpenDelete(event.id)}
                            className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-full hover:bg-red-100 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="card">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-stone-100 rounded"
            >
              ←
            </button>
            <h2 className="font-semibold text-stone-900">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-stone-100 rounded"
            >
              →
            </button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-stone-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="p-2 min-h-[80px]" />
              ))}
              {monthDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-1 min-h-[80px] border border-stone-100 rounded ${
                      isToday ? "bg-amber-50 border-amber-200" : ""
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 ${isToday ? "text-amber-700" : "text-stone-600"}`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${getEventTypeColor(event.eventType)}`}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-stone-500">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="bg-stone-50 rounded-lg p-4 text-sm text-stone-600">
        <strong>Schedule:</strong> Forum meetings are typically held on the 2nd Thursday of each month, 12:00 PM – 4:30 PM ET.
        Member birthdays appear from dates set in My Profile.
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="font-semibold text-stone-900">Edit Event</h3>
              <button 
                onClick={() => setEditingEvent(null)} 
                className="text-stone-400 hover:text-stone-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditEvent} className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Event title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editForm.eventDate}
                    onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="For multi-day events"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Event Type</label>
                  <select
                    value={editForm.eventType}
                    onChange={(e) => setEditForm({ ...editForm, eventType: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="general">General</option>
                    <option value="forum">Forum</option>
                    <option value="chapter">Chapter</option>
                    <option value="social">Social</option>
                    <option value="retreat">Retreat</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Address / Location
                </label>
                <AddressAutocomplete
                  value={editForm.location}
                  onChange={(location) => setEditForm({ ...editForm, location })}
                  placeholder="e.g. 123 Main St, Anytown, USA"
                />
                <p className="text-xs text-stone-500 mt-1">
                  This address will be used for the map on the home page when this event is next.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={editFormSubmitting}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {editFormSubmitting ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">Delete Event</h3>
                  <p className="text-sm text-stone-600 mt-1">
                    Are you sure you want to delete &quot;{deleteConfirmEvent.title}&quot;? This will also remove all associated attendees and RSVPs. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirmEvent(null)}
                  className="btn btn-ghost"
                  disabled={deleteSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={deleteSubmitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteSubmitting ? "Deleting..." : "Delete Event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
