import { siteConfig, isEmail } from "@/site.config";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { CONSTITUTION_DRIVE_URL } from "@/lib/constitution";
import { ConstitutionSign } from "./constitution-sign";

const ROLES = [
  { role: "Moderator", person: "TBD", term: "Current year" },
  { role: "Moderator-Elect", person: "TBD", term: "Next year" },
  { role: "Moderator-Elect-Elect / Goal Tracker", person: "TBD", term: "Year after" },
  { role: "Treasurer", person: "TBD", term: "" },
  { role: "Timekeeper", person: "TBD", term: "" },
  { role: "Learning Czar", person: "TBD", term: "" },
  { role: "Social / Calendar Manager", person: "TBD", term: "" },
  { role: "Retreat Coordinator", person: "TBD", term: "" },
];

export default function ConstitutionPage() {
  return (
    <div>
      <PageHeader
        title="Constitution"
        description={`${siteConfig.forumName} governing document`}
      />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <ConstitutionSign />

        {/* Core Values */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Core Values</h2>
          <div className="space-y-4 mb-6">
            <div className="accent-border pl-4 py-2">
              <h3 className="font-semibold text-stone-900">Respect</h3>
              <p className="text-sm text-stone-600">Honor each other's perspectives, experiences, and boundaries. Listen to understand, not to respond.</p>
            </div>
            <div className="accent-border pl-4 py-2">
              <h3 className="font-semibold text-stone-900">All In</h3>
              <p className="text-sm text-stone-600">Full commitment to the forum and each other. Show up prepared, present, and engaged.</p>
            </div>
            <div className="accent-border pl-4 py-2">
              <h3 className="font-semibold text-stone-900">Own It</h3>
              <p className="text-sm text-stone-600">Take responsibility for our actions, words, and growth. No excuses, no blame.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 rounded-lg">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Vision</p>
              <p className="font-semibold text-stone-900">Grow Together.</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-lg">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Mission</p>
              <p className="text-sm text-stone-700">The branches bloom when the roots are strong.</p>
            </div>
          </div>
        </section>

        {/* Confidentiality */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Confidentiality</h2>
          <div className="accent-border pl-4 py-4 bg-stone-50 rounded-r-lg">
            <p className="text-2xl font-medium text-stone-900 italic">"Nothing, no one, ever."</p>
            <p className="text-sm text-stone-600 mt-2">
              What is shared in forum stays in forum. Period. Breaking confidentiality 
              is grounds for expulsion from the forum.
            </p>
          </div>
        </section>

        {/* Forum Structure */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Forum Structure</h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-stone-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-stone-900">6–9</p>
              <p className="text-xs text-stone-500">Group Size</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-lg text-center">
              <p className="text-lg font-bold text-stone-900">Jul 1 – Jun 30</p>
              <p className="text-xs text-stone-500">Fiscal Year</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-stone-900">$TBD</p>
              <p className="text-xs text-stone-500">Annual Dues</p>
            </div>
          </div>

          <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-3">Roles</h3>
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-2 text-stone-500 font-medium">Role</th>
                  <th className="text-left py-2 text-stone-500 font-medium">Person</th>
                  <th className="text-left py-2 text-stone-500 font-medium">Term</th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r.role} className="border-b border-stone-100">
                    <td className="py-2 text-stone-700">{r.role}</td>
                    <td className="py-2 text-stone-900 font-medium">{r.person}</td>
                    <td className="py-2 text-stone-500 text-xs">{r.term}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Meeting Rules */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">How We Meet</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Schedule</h3>
              <p className="text-stone-900 font-medium">2nd Thursday of each month</p>
              <p className="text-stone-600 text-sm">12:00 PM – 4:30 PM ET (typical)</p>
              <p className="text-stone-500 text-sm">Lunch: 12:00 – 12:30 PM</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Meeting Rituals</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="accent-border pl-3 py-2">
                  <p className="font-medium text-stone-900 text-sm">5% Check-In</p>
                  <p className="text-stone-600 text-xs">Share state across Work, Family, Personal</p>
                </div>
                <div className="accent-border pl-3 py-2">
                  <p className="font-medium text-stone-900 text-sm">Deep Dive</p>
                  <p className="text-stone-600 text-xs">Coach facilitates; Scribe captures</p>
                </div>
                <div className="accent-border pl-3 py-2">
                  <p className="font-medium text-stone-900 text-sm">Parking Lot Review</p>
                  <p className="text-stone-600 text-xs">Quick updates and topics</p>
                </div>
                <div className="accent-border pl-3 py-2">
                  <p className="font-medium text-stone-900 text-sm">Goal Review</p>
                  <p className="text-stone-600 text-xs">1, 3, 6, and 12-month goals</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Alcohol Policy</h3>
              <p className="text-stone-700 text-sm">No alcohol at meetings.</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Deep Dive Rules</h3>
              <ul className="text-sm space-y-1">
                <li className="text-stone-700"><span className="text-green-700 mr-2">✓</span>Coaching meeting ≥1 week prior to forum</li>
                <li className="text-stone-700"><span className="text-green-700 mr-2">✓</span>Presenter shares openly and honestly</li>
                <li className="text-stone-700"><span className="text-green-700 mr-2">✓</span>Coach facilitates; focus on feelings, not fixing</li>
                <li className="text-stone-700"><span className="text-green-700 mr-2">✓</span>Share experience only — no advice</li>
                <li className="text-stone-700"><span className="text-green-700 mr-2">✓</span>Use "I" statements</li>
                <li className="text-stone-700"><span className="text-red-700 mr-2">✗</span>No cross-talk during sharing</li>
                <li className="text-stone-700"><span className="text-red-700 mr-2">✗</span>No fixing — presenter owns their decision</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Fines</h3>
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="pr-8 py-1 text-stone-600">Tardy / Early Departure</td>
                    <td className="py-1 text-stone-900 font-medium">$TBD</td>
                  </tr>
                  <tr>
                    <td className="pr-8 py-1 text-stone-600">Unexcused Absence</td>
                    <td className="py-1 text-stone-900 font-medium">$TBD</td>
                  </tr>
                  <tr>
                    <td className="pr-8 py-1 text-stone-600">Phone Violation</td>
                    <td className="py-1 text-stone-900 font-medium">$TBD</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Voting & Membership */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Voting & Membership</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Voting</h3>
              <p className="text-stone-700 text-sm">All major decisions require unanimous consent.</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">5% Participation</h3>
              <p className="text-stone-700 text-sm">Members are expected to participate in at least 5% of all forum activities.</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">New Members</h3>
              <p className="text-stone-700 text-sm">Adding new members requires unanimous approval by existing members.</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Departing Members</h3>
              <p className="text-stone-700 text-sm">Members departing should provide adequate notice and participate in a proper goodbye.</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Relationships</h3>
              <p className="text-stone-700 text-sm">No romantic relationships between forum members.</p>
              <p className="text-stone-700 text-sm mt-1">Business dealings between members require disclosure to the forum.</p>
            </div>
          </div>
        </section>

        {/* Retreat */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Retreat</h2>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-3 bg-amber-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-900">$TBD</p>
                <p className="text-xs text-amber-700">Max per member</p>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg">
                <p className="text-sm text-stone-700">Retreat is mandatory per constitution</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Timeline</h3>
              <p className="text-stone-700 text-sm">Set dates 6 months in advance</p>
              <p className="text-stone-700 text-sm">Finalize details 45 days before</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-600 uppercase tracking-wider mb-2">Prohibited Activities</h3>
              <ul className="text-sm text-stone-700 space-y-1">
                <li>• No illegal drugs</li>
                                                                              </ul>
            </div>
          </div>
        </section>

        {/* Emergency Meetings */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Emergency Meetings</h2>
          <p className="text-stone-700 text-sm">
            Any member may call an emergency meeting when urgent support is needed. 
            The forum will convene as quickly as schedules allow.
          </p>
        </section>

        <section className="p-4 bg-stone-100 rounded-lg">
          <p className="text-xs text-stone-500 text-center">
            The Constitution document on Google Drive (<Link href={CONSTITUTION_DRIVE_URL} target="_blank" className="underline">constitution document</Link>) is the authoritative source.
            This page provides a summary only.
          </p>
        </section>
      </div>
    </div>
  );
}
