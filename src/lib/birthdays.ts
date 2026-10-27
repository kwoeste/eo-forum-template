import type { Meeting } from "@/lib/calendar-data";

export function toDateOnlyString(value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function parseDateOnlyParts(
  value: unknown
): { year: number; month: number; day: number } | null {
  const dateOnly = toDateOnlyString(value);
  if (!dateOnly) {
    return null;
  }

  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return { year, month, day };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function resolvedBirthdayDay(month: number, day: number, year: number): number {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return 28;
  }
  return day;
}

export function birthdayDateForYear(month: number, day: number, year: number): Date {
  return new Date(year, month - 1, resolvedBirthdayDay(month, day, year));
}

export function birthdayDateStringForYear(
  month: number,
  day: number,
  year: number
): string {
  const resolvedDay = resolvedBirthdayDay(month, day, year);
  return `${year}-${String(month).padStart(2, "0")}-${String(resolvedDay).padStart(2, "0")}`;
}

export function formatBirthdayMonthDay(value: unknown): string | null {
  const parts = parseDateOnlyParts(value);
  if (!parts) {
    return null;
  }

  return birthdayDateForYear(parts.month, parts.day, parts.year).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric" }
  );
}

export function getNextBirthday(value: unknown, from = new Date()): Date | null {
  const parts = parseDateOnlyParts(value);
  if (!parts) {
    return null;
  }

  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = birthdayDateForYear(parts.month, parts.day, today.getFullYear());
  if (next < today) {
    next = birthdayDateForYear(parts.month, parts.day, today.getFullYear() + 1);
  }
  return next;
}

export interface BirthdayMember {
  id: string;
  name: string;
  birthday: string | null;
}

export function toBirthdayCalendarEvents(
  members: BirthdayMember[],
  years: number[]
): Meeting[] {
  const uniqueYears = [...new Set(years)].sort((a, b) => a - b);
  const events: Meeting[] = [];

  for (const member of members) {
    const parts = parseDateOnlyParts(member.birthday);
    if (!parts || !member.name) {
      continue;
    }

    for (const year of uniqueYears) {
      events.push({
        id: `birthday-${member.id}-${year}`,
        title: `${member.name}'s Birthday`,
        date: birthdayDateStringForYear(parts.month, parts.day, year),
        startTime: "00:00",
        endTime: "23:59",
        location: null,
        eventType: "birthday",
      });
    }
  }

  return events;
}
