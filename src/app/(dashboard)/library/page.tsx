import { siteConfig, isEmail } from "@/site.config";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { LibraryFeelingsUpload } from "./library-upload";
import { LibraryAgendas } from "./library-agendas";

const LIBRARY_LINKS = [
  {
    id: "feelings",
    title: "Feelings and Needs Inventory",
    description: "Reference for 5% Reflection emotional vocabulary",
    driveUrl: null,
    category: "Resources",
    isPlaceholder: true,
  },
  {
    id: "1",
    title: "Constitution",
    description: `${siteConfig.forumName} governing document`,
    driveUrl: siteConfig.constitutionUrl || null,
    category: "Governance",
  },
  ];

const ONSITE_FORMS = [
  {
    id: "5p",
    title: "5% Reflection",
    description: "Monthly check-in worksheet, or upload a photo of your paper copy",
    href: "/five-percent",
  },
  {
    id: "dd",
    title: "Deep Dive Pack",
    description: "Presenter, Coach, and I-Scribe worksheets",
    href: "/deep-dive",
  },
];

export default function LibraryPage() {
  const categories = [...new Set(LIBRARY_LINKS.map((link) => link.category).filter(Boolean))];

  return (
    <div>
      <PageHeader
        title="Library"
        description="Documents, templates, and resources"
      />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <section className="card">
          <div className="p-4 border-b border-stone-200">
            <h2 className="font-semibold text-stone-900">Fillable Forms</h2>
            <p className="text-sm text-stone-500">Complete these on the site, or upload a photo of a paper 5% reflection</p>
          </div>
          <div className="p-4 grid sm:grid-cols-2 gap-3">
            {ONSITE_FORMS.map((form) => (
              <Link
                key={form.id}
                href={form.href}
                className="p-4 rounded-lg border border-stone-200 hover:border-amber-300 hover:bg-amber-50 transition-colors"
              >
                <h3 className="font-medium text-stone-900">{form.title}</h3>
                <p className="text-sm text-stone-500 mt-1">{form.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="feelings-inventory" className="card">
          <div className="p-4 border-b border-stone-200">
            <h2 className="font-semibold text-stone-900">Feelings and Needs Inventory</h2>
            <p className="text-sm text-stone-500">Reference for 5% Reflection emotional vocabulary</p>
          </div>
          <div className="p-4">
            <div className="bg-stone-50 rounded-lg p-4 text-center">
              <p className="text-sm text-stone-600 mb-3">
                Upload the EO Feelings List PDF here. This document helps members identify 
                and articulate emotions during 5% reflections.
              </p>
              <LibraryFeelingsUpload />
              <p className="text-xs text-stone-500 mt-2">
                Admin can upload the PDF. Source: Kelly Farrell&apos;s Forum Feelings List.
              </p>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="p-4 border-b border-stone-200">
            <h2 className="font-semibold text-stone-900">Meeting Agendas</h2>
            <p className="text-sm text-stone-500">Per-meeting agenda uploads</p>
          </div>
          <div className="p-4">
            <LibraryAgendas />
          </div>
        </section>

        {categories.filter(c => c !== "Agendas").map((category) => (
          <section key={category} className="card">
            <div className="p-4 border-b border-stone-200">
              <h2 className="font-semibold text-stone-900">{category}</h2>
            </div>
            <div className="divide-y divide-stone-200">
              {LIBRARY_LINKS.filter((link) => link.category === category && !link.isPlaceholder).map(
                (link) => (
                  <Link
                    key={link.id}
                    href={link.driveUrl || "#"}
                    target={link.driveUrl ? "_blank" : undefined}
                    rel={link.driveUrl ? "noopener noreferrer" : undefined}
                    className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
                  >
                    <div>
                      <h3 className="font-medium text-stone-900">{link.title}</h3>
                      <p className="text-sm text-stone-500">{link.description}</p>
                    </div>
                    <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                )
              )}
            </div>
          </section>
        ))}

        <div className="p-4 bg-stone-100 rounded-lg text-center">
          <p className="text-xs text-stone-500">
            Documents are stored on Google Drive. Contact the Moderator to add new documents.
          </p>
        </div>
      </div>
    </div>
  );
}
