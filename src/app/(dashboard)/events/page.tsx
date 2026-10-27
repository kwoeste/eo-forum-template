"use client";
import { siteConfig, isEmail } from "@/site.config";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { AddressAutocomplete } from "@/components/address-autocomplete";

interface AttendanceInfo {
  total: number;
  attending: number;
  notAttending: number;
  pending: number;
}

interface Attendee {
  id: string;
  email: string;
  rsvpStatus: string;
  memberName: string | null;
  inviteSentAt: string | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  eventType: string;
  attendance?: AttendanceInfo;
}

function formatEventDate(dateStr: string, endDateStr?: string | null): string {
  const date = new Date(dateStr + "T12:00:00");
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  
  if (endDateStr && endDateStr !== dateStr) {
    const endDate = new Date(endDateStr + "T12:00:00");
    const endFormatted = endDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return `${formatted} – ${endFormatted}`;
  }
  
  return formatted;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function getEventTypeColor(eventType: string): string {
  switch (eventType) {
    case "forum":
      return "bg-amber-100 text-amber-800";
    case "chapter":
      return "bg-blue-100 text-blue-800";
    case "social":
      return "bg-purple-100 text-purple-800";
    case "retreat":
      return "bg-green-100 text-green-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getEventTypeLabel(eventType: string): string {
  switch (eventType) {
    case "forum":
      return "Forum";
    case "chapter":
      return "Chapter";
    case "social":
      return "Social";
    case "retreat":
      return "Retreat";
    default:
      return "Event";
  }
}

function AttendanceDisplay({ attendance, onShowDetails }: { 
  attendance: AttendanceInfo; 
  onShowDetails: () => void;
}) {
  if (attendance.total === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex items-center gap-4 text-sm">
      <button 
        onClick={onShowDetails}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            {attendance.attending}
          </span>
          <span className="text-green-700">Yes</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            {attendance.notAttending}
          </span>
          <span className="text-red-700">No</span>
        </span>
        {attendance.pending > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
              {attendance.pending}
            </span>
            <span className="text-slate-500">Pending</span>
          </span>
        )}
      </button>
    </div>
  );
}

function AttendeeModal({ 
  event, 
  attendees, 
  onClose, 
  onRsvp,
  currentUserRsvp,
  rsvpLoading 
}: { 
  event: CalendarEvent; 
  attendees: Attendee[]; 
  onClose: () => void;
  onRsvp: (status: 'accepted' | 'declined') => void;
  currentUserRsvp: string | null;
  rsvpLoading: boolean;
}) {
  const attending = attendees.filter(a => a.rsvpStatus === 'accepted');
  const notAttending = attendees.filter(a => a.rsvpStatus === 'declined');
  const pending = attendees.filter(a => a.rsvpStatus === 'pending');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">Attendance - {event.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="mb-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-700 mb-2">Your RSVP</p>
            <div className="flex gap-2">
              <button
                onClick={() => onRsvp('accepted')}
                disabled={rsvpLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentUserRsvp === 'accepted'
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-green-50 hover:border-green-300'
                } disabled:opacity-50`}
              >
                {rsvpLoading ? '...' : 'Yes, Attending'}
              </button>
              <button
                onClick={() => onRsvp('declined')}
                disabled={rsvpLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentUserRsvp === 'declined'
                    ? 'bg-red-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-red-50 hover:border-red-300'
                } disabled:opacity-50`}
              >
                {rsvpLoading ? '...' : 'No, Not Attending'}
              </button>
            </div>
          </div>

          {attending.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Attending ({attending.length})
              </h4>
              <ul className="space-y-1">
                {attending.map(a => (
                  <li key={a.id} className="text-sm text-slate-600 pl-6">
                    {a.memberName || a.email}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {notAttending.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Not Attending ({notAttending.length})
              </h4>
              <ul className="space-y-1">
                {notAttending.map(a => (
                  <li key={a.id} className="text-sm text-slate-600 pl-6">
                    {a.memberName || a.email}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pending ({pending.length})
              </h4>
              <ul className="space-y-1">
                {pending.map(a => (
                  <li key={a.id} className="text-sm text-slate-400 pl-6">
                    {a.memberName || a.email}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {attendees.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">
              No invites sent yet. Use &quot;Send Invite&quot; to invite all members.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedEventAttendees, setSelectedEventAttendees] = useState<Attendee[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [inviteSending, setInviteSending] = useState<string | null>(null);
  const [currentUserRsvp, setCurrentUserRsvp] = useState<string | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editFormSubmitting, setEditFormSubmitting] = useState(false);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<CalendarEvent | null>(null);
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
    description: "",
    eventDate: "",
    endDate: "",
    startTime: "12:00",
    endTime: "16:30",
    location: "",
    eventType: "general",
  });

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events?upcoming=true&includeAttendance=true");
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.eventDate) {
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
          description: newEvent.description || null,
          eventDate: newEvent.eventDate,
          endDate: newEvent.endDate || null,
          startTime: newEvent.startTime || null,
          endTime: newEvent.endTime || null,
          location: newEvent.location || null,
          eventType: newEvent.eventType,
        }),
      });

      if (response.ok) {
        setNewEvent({
          title: "",
          description: "",
          eventDate: "",
          endDate: "",
          startTime: "12:00",
          endTime: "16:30",
          location: "",
          eventType: "general",
        });
        setShowAddForm(false);
        fetchEvents();
      } else {
        const errData = await response.json();
        alert(errData.error || "Failed to add event");
      }
    } catch (err) {
      console.error("Error adding event:", err);
      alert("Failed to add event");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSendInvite = async (eventId: string) => {
    setInviteSending(eventId);
    try {
      const response = await fetch(`/api/events/${eventId}/invite`, {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Invites prepared for ${data.invitees.length} members.\n\nICS file generated. For automatic Google Calendar invites, configure GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_CALENDAR_ID environment variables.`);
        fetchEvents();
      } else {
        const errData = await response.json();
        alert(errData.error || "Failed to send invites");
      }
    } catch (err) {
      console.error("Error sending invites:", err);
      alert("Failed to send invites");
    } finally {
      setInviteSending(null);
    }
  };

  const handleShowAttendees = async (event: CalendarEvent) => {
    setSelectedEvent(event);
    setAttendeesLoading(true);
    setCurrentUserRsvp(null);
    
    try {
      const [attendeesRes, rsvpRes] = await Promise.all([
        fetch(`/api/events/${event.id}/invite`),
        fetch(`/api/events/${event.id}/rsvp`),
      ]);
      
      if (attendeesRes.ok) {
        const data = await attendeesRes.json();
        setSelectedEventAttendees(data.attendees || []);
      }
      
      if (rsvpRes.ok) {
        const data = await rsvpRes.json();
        setCurrentUserRsvp(data.rsvpStatus);
      }
    } catch (err) {
      console.error("Error fetching attendees:", err);
    } finally {
      setAttendeesLoading(false);
    }
  };

  const handleRsvp = async (status: 'accepted' | 'declined') => {
    if (!selectedEvent) return;
    
    setRsvpLoading(true);
    try {
      const response = await fetch(`/api/events/${selectedEvent.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        setCurrentUserRsvp(status);
        const attendeesRes = await fetch(`/api/events/${selectedEvent.id}/invite`);
        if (attendeesRes.ok) {
          const data = await attendeesRes.json();
          setSelectedEventAttendees(data.attendees || []);
        }
        fetchEvents();
      }
    } catch (err) {
      console.error("Error updating RSVP:", err);
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleOpenEdit = (event: CalendarEvent) => {
    setEditForm({
      title: event.title,
      description: event.description || "",
      eventDate: event.eventDate,
      endDate: event.endDate || "",
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      location: event.location || "",
      eventType: event.eventType,
    });
    setEditingEvent(event);
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

  const now = new Date();
  const upcomingEvents = events.filter(
    (e) => new Date(e.eventDate + "T23:59:59") >= now
  );
  const pastEvents = events.filter(
    (e) => new Date(e.eventDate + "T23:59:59") < now
  );

  const nextForumMeeting = upcomingEvents.find((e) => e.eventType === "forum");

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Events"
          description="Forum meetings and chapter events"
        />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card p-12 text-center">
            <div className="text-slate-400 text-5xl mb-4">📅</div>
            <p className="text-slate-500">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Events"
          description="Forum meetings and chapter events"
        />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card p-12 text-center">
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => { setLoading(true); setError(null); window.location.reload(); }}
              className="mt-4 text-amber-700 hover:text-amber-800"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Events"
        description="Forum meetings and chapter events"
      />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Add Event Button and Form */}
        <div className="card">
          <div className="px-6 py-4 flex justify-between items-center">
            <span className="text-sm text-slate-600">
              {upcomingEvents.length} upcoming event{upcomingEvents.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-primary text-sm"
            >
              {showAddForm ? "Cancel" : "Add Event"}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddEvent} className="p-6 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Add New Event</h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Event title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newEvent.eventDate}
                    onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="For multi-day events"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                  <select
                    value={newEvent.eventType}
                    onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address / Location
                </label>
                <AddressAutocomplete
                  value={newEvent.location}
                  onChange={(location) => setNewEvent({ ...newEvent, location })}
                  placeholder="e.g. 123 Main St, Anytown, USA"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This address will be used for the map on the home page when this event is next.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <button
                type="submit"
                disabled={formSubmitting}
                className="btn btn-primary disabled:opacity-50"
              >
                {formSubmitting ? "Adding..." : "Add Event"}
              </button>
            </form>
          )}
        </div>

        {/* Next Forum Meeting highlight */}
        {nextForumMeeting && (
          <div className="card p-6 bg-amber-50 border-amber-200">
            <p className="text-xs text-amber-600 uppercase tracking-wide font-medium mb-1">
              Next Forum Meeting
            </p>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {formatEventDate(nextForumMeeting.eventDate)}
            </h2>
            <p className="text-slate-600">
              {nextForumMeeting.startTime && nextForumMeeting.endTime
                ? `${formatTime(nextForumMeeting.startTime)} – ${formatTime(nextForumMeeting.endTime)} ET`
                : "Time TBD"}
            </p>
            {nextForumMeeting.location && (
              <p className="text-slate-500 mt-1 text-sm flex items-center">
                <svg className="w-4 h-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {nextForumMeeting.location}
              </p>
            )}
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Events</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-slate-600 mt-1">{event.description}</p>
                      )}
                      <div className="mt-3 space-y-1">
                        <p className="text-slate-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatEventDate(event.eventDate, event.endDate)}
                        </p>
                        {event.startTime && event.endTime && (
                          <p className="text-slate-700 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTime(event.startTime)} – {formatTime(event.endTime)} ET
                          </p>
                        )}
                        {event.location && (
                          <p className="text-slate-700 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.location}
                          </p>
                        )}
                      </div>
                      
                      {event.attendance && (
                        <AttendanceDisplay 
                          attendance={event.attendance} 
                          onShowDetails={() => handleShowAttendees(event)} 
                        />
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className={`px-3 py-1 text-xs rounded-full shrink-0 ${getEventTypeColor(event.eventType)}`}>
                        {getEventTypeLabel(event.eventType)}
                      </span>
                      <button
                        onClick={() => handleSendInvite(event.id)}
                        disabled={inviteSending === event.id}
                        className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {inviteSending === event.id ? "Sending..." : "Send Invite"}
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEdit(event)}
                          className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmEvent(event)}
                          className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-full hover:bg-red-100 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingEvents.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-slate-400 text-5xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No upcoming events
            </h3>
            <p className="text-slate-500">
              Add an event to get started.
            </p>
          </div>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Past Events</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {pastEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="p-6 opacity-60">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{event.title}</h3>
                      <p className="text-slate-600 text-sm mt-1">
                        {formatEventDate(event.eventDate, event.endDate)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 text-xs rounded-full ${getEventTypeColor(event.eventType)}`}>
                        {getEventTypeLabel(event.eventType)}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEdit(event)}
                          className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmEvent(event)}
                          className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-full hover:bg-red-100 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-100 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-600">
            Events are coordinated through {siteConfig.chapterName} and the forum. New events added here will appear on the home page map when they have an address.
          </p>
        </div>
      </div>

      {selectedEvent && (
        <AttendeeModal
          event={selectedEvent}
          attendees={selectedEventAttendees}
          onClose={() => setSelectedEvent(null)}
          onRsvp={handleRsvp}
          currentUserRsvp={currentUserRsvp}
          rsvpLoading={rsvpLoading}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">Edit Event</h3>
              <button 
                onClick={() => setEditingEvent(null)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditEvent} className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Event title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editForm.eventDate}
                    onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="For multi-day events"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                  <select
                    value={editForm.eventType}
                    onChange={(e) => setEditForm({ ...editForm, eventType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address / Location
                </label>
                <AddressAutocomplete
                  value={editForm.location}
                  onChange={(location) => setEditForm({ ...editForm, location })}
                  placeholder="e.g. 123 Main St, Anytown, USA"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This address will be used for the map on the home page when this event is next.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  <h3 className="font-semibold text-slate-900">Delete Event</h3>
                  <p className="text-sm text-slate-600 mt-1">
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
