export interface Meeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  eventType: "forum" | "chapter" | "social" | "retreat" | "birthday" | "general";
}

export function formatMeetingDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function getEventTypeColor(eventType: Meeting["eventType"]): string {
  switch (eventType) {
    case "forum":
      return "bg-amber-100 text-amber-800";
    case "chapter":
      return "bg-blue-100 text-blue-800";
    case "social":
      return "bg-purple-100 text-purple-800";
    case "retreat":
      return "bg-green-100 text-green-800";
    case "birthday":
      return "bg-pink-100 text-pink-800";
    case "general":
      return "bg-slate-100 text-slate-700";
    default: {
      const _exhaustive: never = eventType;
      throw new Error(`Unhandled event type: ${String(_exhaustive)}`);
    }
  }
}

export function getEventTypeLabel(eventType: Meeting["eventType"]): string {
  switch (eventType) {
    case "forum":
      return "Forum";
    case "chapter":
      return "Chapter";
    case "social":
      return "Social";
    case "retreat":
      return "Retreat";
    case "birthday":
      return "Birthday";
    case "general":
      return "Event";
    default: {
      const _exhaustive: never = eventType;
      throw new Error(`Unhandled event type: ${String(_exhaustive)}`);
    }
  }
}
