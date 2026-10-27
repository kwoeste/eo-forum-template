"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { formatBirthdayMonthDay, getNextBirthday } from "@/lib/birthdays";
import type { ForumMember, SocialLinks } from "@/lib/members-query";

interface MembersClientProps {
  members: ForumMember[];
}

function daysUntilDate(date: Date, today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function truncateBio(bio: string | null): string | null {
  if (!bio) return null;
  const firstSentence = bio.match(/^[^.!?]*[.!?]/);
  if (firstSentence && firstSentence[0].length < 150) {
    return firstSentence[0].trim();
  }
  if (bio.length <= 100) return bio;
  return bio.slice(0, 100).trim() + "…";
}

function BirthdayBadge({ birthday, today }: { birthday: string | null; today: Date }) {
  if (!birthday) return null;

  const nextBirthday = getNextBirthday(birthday, today);
  if (!nextBirthday) return null;

  const daysUntil = daysUntilDate(nextBirthday, today);
  if (daysUntil > 30) return null;

  let label: string;
  let urgency: "today" | "soon" | "upcoming";

  if (daysUntil === 0) {
    label = "Birthday today!";
    urgency = "today";
  } else if (daysUntil === 1) {
    label = "Birthday tomorrow";
    urgency = "soon";
  } else if (daysUntil <= 7) {
    label = `Birthday in ${daysUntil} days`;
    urgency = "soon";
  } else {
    label = `Birthday in ${daysUntil} days`;
    urgency = "upcoming";
  }

  const colorClass =
    urgency === "today"
      ? "bg-amber-200 text-amber-900"
      : urgency === "soon"
      ? "bg-amber-100 text-amber-800"
      : "bg-stone-100 text-stone-600";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>
      🎂 {label}
    </span>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-5 h-5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SocialLinksDisplay({ links }: { links: SocialLinks | null }) {
  if (!links) return null;

  const entries = Object.entries(links).filter(([, url]) => url && url.trim());
  if (entries.length === 0) return null;

  const icons: Record<string, string> = {
    linkedin: "LinkedIn",
    twitter: "X/Twitter",
    instagram: "Instagram",
    facebook: "Facebook",
    other: "Website",
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {entries.map(([platform, url]) => (
        <a
          key={platform}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-amber-700 hover:text-amber-900 hover:underline"
        >
          {icons[platform] || platform}
        </a>
      ))}
    </div>
  );
}

function MemberCard({
  member,
  isCurrentUser,
  today,
}: {
  member: ForumMember;
  isCurrentUser: boolean;
  today: Date;
}) {
  const [expanded, setExpanded] = useState(false);
  const truncatedBio = truncateBio(member.about);
  const hasMoreDetails =
    member.about ||
    member.spouse ||
    member.businessName ||
    member.businessWebsite ||
    member.socialLinks;

  return (
    <article className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {member.profilePhotoUrl ? (
            <Image
              src={member.profilePhotoUrl}
              alt={`${member.name}'s profile photo`}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-slate-600 font-medium text-xl">{getInitials(member.name)}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-slate-900">{member.name}</h3>
              {member.isAdmin && (
                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                  Admin
                </span>
              )}
            </div>

            <p className="text-slate-600 text-sm">{member.role}</p>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {member.birthday && (
                <span className="text-sm text-slate-500">
                  🎂 {formatBirthdayMonthDay(member.birthday)}
                </span>
              )}
              <BirthdayBadge birthday={member.birthday} today={today} />
            </div>

            {truncatedBio && !expanded && (
              <p className="text-sm text-slate-600 mt-3 line-clamp-2">{truncatedBio}</p>
            )}
          </div>

          {isCurrentUser && (
            <Link
              href="/profile"
              className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-md transition-colors"
            >
              Edit
            </Link>
          )}
        </div>

        {hasMoreDetails && (
          <div className="mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-controls={`member-details-${member.id}`}
              className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <span>{expanded ? "Less" : "More"}</span>
              <ChevronIcon expanded={expanded} />
            </button>
          </div>
        )}
      </div>

      {expanded && hasMoreDetails && (
        <div
          id={`member-details-${member.id}`}
          className="px-6 pb-6 pt-0 border-t border-slate-100"
        >
          <div className="pt-4 space-y-4">
            {member.about && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  About
                </p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap">{member.about}</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {member.spouse && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Spouse
                  </p>
                  <p className="text-sm text-slate-900">{member.spouse}</p>
                </div>
              )}

              {member.birthday && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Birthday
                  </p>
                  <p className="text-sm text-slate-900">
                    {formatBirthdayMonthDay(member.birthday)}
                  </p>
                </div>
              )}

              {member.businessName && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Business
                  </p>
                  <p className="text-sm text-slate-900">{member.businessName}</p>
                  {member.businessWebsite && (
                    <a
                      href={member.businessWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-700 hover:underline"
                    >
                      {member.businessWebsite.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              )}
            </div>

            {member.socialLinks && <SocialLinksDisplay links={member.socialLinks} />}
          </div>
        </div>
      )}
    </article>
  );
}

export function MembersClient({ members }: MembersClientProps) {
  const { user } = useUser();
  const today = new Date();

  const userEmails =
    user?.emailAddresses?.map((e) => e.emailAddress.toLowerCase()) ?? [];
  const isCurrentUser = (member: ForumMember): boolean =>
    Boolean(member.email && userEmails.includes(member.email.toLowerCase()));

  const membersWithBirthdays = members
    .map((member) => {
      const nextBirthday = getNextBirthday(member.birthday, today);
      return { member, nextBirthday, daysUntil: nextBirthday ? daysUntilDate(nextBirthday, today) : null };
    })
    .sort((a, b) => {
      const aUpcoming = a.daysUntil !== null && a.daysUntil <= 30;
      const bUpcoming = b.daysUntil !== null && b.daysUntil <= 30;
      if (aUpcoming && !bUpcoming) return -1;
      if (!aUpcoming && bUpcoming) return 1;
      if (aUpcoming && bUpcoming) return (a.daysUntil ?? 0) - (b.daysUntil ?? 0);
      return a.member.name.localeCompare(b.member.name);
    });

  const upcomingBirthdays = membersWithBirthdays.filter(
    (m) => m.daysUntil !== null && m.daysUntil <= 30
  );

  return (
    <div className="space-y-8">
      {upcomingBirthdays.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <p className="text-amber-800 text-sm font-medium">
            🎉 {upcomingBirthdays.length === 1
              ? `${upcomingBirthdays[0].member.name}'s birthday is coming up!`
              : `${upcomingBirthdays.length} birthdays coming up in the next 30 days`}
          </p>
        </div>
      )}

      <div className="bg-stone-100 rounded-xl p-4 border border-stone-200">
        <p className="text-stone-600 text-sm">
          Update your birthday, bio, and other details in{" "}
          <Link href="/profile" className="text-amber-700 underline font-medium hover:text-amber-800">
            My Profile
          </Link>
          .
        </p>
      </div>

      <div className="space-y-4">
        {membersWithBirthdays.map(({ member }) => (
          <MemberCard
            key={member.id}
            member={member}
            isCurrentUser={isCurrentUser(member)}
            today={today}
          />
        ))}
      </div>
    </div>
  );
}
