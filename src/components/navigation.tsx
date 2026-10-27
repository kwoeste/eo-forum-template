"use client";
import { siteConfig, isEmail } from "@/site.config";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  ReportProblemDialog,
  ReportProblemIcon,
  ReportProblemTrigger,
} from "@/components/report-problem";
import { clerkUserIsSiteAdmin } from "@/lib/admin";

const navGroups = [
  {
    label: "Forum",
    items: [
      { href: "/", label: "Home" },
      { href: "/five-percent", label: "5%" },
      { href: "/deep-dive", label: "Deep Dive" },
      { href: "/parking-lot", label: "Parking Lot" },
      { href: "/round-table", label: "Round Table" },
      { href: "/goals", label: "Goals" },
      { href: "/retreat", label: "Retreat" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/members", label: "Members" },
      { href: "/lifeline", label: "Timelines" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/calendar", label: "Calendar" },
      { href: "/events", label: "Events" },
      { href: "/library", label: "Library" },
      { href: "/constitution", label: "Constitution" },
      { href: "/treasurer", label: "Treasurer" },
    ],
  },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ProfileMenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BugsMenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M8 6h8" />
      <path d="M8 12h8" />
      <path d="M8 18h5" />
      <rect x="4" y="3" width="16" height="18" rx="2" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function AccountButton({
  isSiteAdmin,
  onReport,
}: {
  isSiteAdmin: boolean;
  onReport: () => void;
}) {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "w-8 h-8",
        },
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Link
          label="Profile"
          labelIcon={<ProfileMenuIcon />}
          href="/profile"
        />
        {isSiteAdmin ? (
          <UserButton.Link
            label="Bug reports"
            labelIcon={<BugsMenuIcon />}
            href="/bugs"
          />
        ) : null}
        <UserButton.Action
          label="Report a problem"
          labelIcon={<ReportProblemIcon />}
          onClick={onReport}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-stone-500">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`block px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? "bg-stone-800 text-white"
                      : "text-stone-400 hover:text-white hover:bg-stone-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const { user } = useUser();
  const isSiteAdmin = clerkUserIsSiteAdmin(user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportKey, setReportKey] = useState(0);

  function openReport() {
    setReportKey((key) => key + 1);
    setReportOpen(true);
  }

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="lg:hidden print:hidden fixed top-0 inset-x-0 z-50 h-14 bg-stone-900 text-stone-300 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            className="p-1.5 rounded hover:bg-stone-800"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="app-sidebar"
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          <Link href="/" className="font-semibold text-white tracking-tight">
            {siteConfig.forumName}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ReportProblemTrigger compact onClick={openReport} />
          <AccountButton isSiteAdmin={isSiteAdmin} onReport={openReport} />
        </div>
      </header>

      {mobileMenuOpen ? (
        <button
          type="button"
          className="lg:hidden print:hidden fixed inset-0 top-14 z-30 bg-black/50"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <aside
        id="app-sidebar"
        aria-label="Sidebar"
        className={`print:hidden fixed top-14 bottom-0 left-0 z-40 w-60 bg-stone-900 text-stone-300 flex flex-col transform transition-transform duration-200 ease-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full max-lg:invisible"
        } lg:top-0 lg:translate-x-0`}
      >
        <div className="hidden lg:flex h-14 items-center px-6 border-b border-stone-800 shrink-0">
          <Link href="/" className="font-semibold text-white tracking-tight">
            {siteConfig.forumName}
          </Link>
        </div>

        <NavLinks pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />

        <div className="hidden lg:flex items-center gap-3 px-5 py-4 border-t border-stone-800 shrink-0">
          <AccountButton isSiteAdmin={isSiteAdmin} onReport={openReport} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-stone-400">Account</p>
            <ReportProblemTrigger onClick={openReport} />
          </div>
        </div>
      </aside>

      <ReportProblemDialog
        key={reportKey}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}
