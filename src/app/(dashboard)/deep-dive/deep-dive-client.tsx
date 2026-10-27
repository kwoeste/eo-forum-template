"use client";
import { siteConfig, isEmail } from "@/site.config";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { INITIAL_MEMBERS } from "@/lib/members-data";
import { AddressAutocomplete } from "@/components/address-autocomplete";

type FormType = "topics" | "planner" | "presenter" | "coach-cheat" | "coach-intro" | "scribe";

interface DeepDiveTopicItem {
  id: string;
  memberId: string | null;
  memberName: string | null;
  date: string | null;
  noteText: string;
  status: string;
  createdAt: string;
}

interface DeepDivePlan {
  coachId: string;
  presenterId: string;
  coachingDate: string;
  coachingTime: string;
  coachingLocation: string;
  meetingId: string;
  coachingStatus: "scheduled" | "happened" | "forms_complete";
}

export function DeepDiveClient() {
  const { user } = useUser();
  const [activeForm, setActiveForm] = useState<FormType>("topics");
  const [plan, setPlan] = useState<DeepDivePlan>({
    coachId: "",
    presenterId: "",
    coachingDate: "",
    coachingTime: "",
    coachingLocation: "",
    meetingId: "",
    coachingStatus: "scheduled",
  });

  const isAdmin = user?.emailAddresses?.some(
    (email) => isEmail(email.emailAddress, siteConfig.adminEmail)
  );
  const isModerator = user?.emailAddresses?.some(
    (email) => isEmail(email.emailAddress, siteConfig.moderatorEmail)
  );

  const forms: { id: FormType; label: string }[] = [
    { id: "topics", label: "Topics" },
    { id: "planner", label: "Plan" },
    { id: "presenter", label: "Presenter" },
    { id: "coach-cheat", label: "Coach Cheat Sheet" },
    { id: "coach-intro", label: "Coach Intro" },
    { id: "scribe", label: "I-Scribe" },
  ];

  const selectedCoach = INITIAL_MEMBERS.find((m) => m.id === plan.coachId);
  const selectedPresenter = INITIAL_MEMBERS.find((m) => m.id === plan.presenterId);

  return (
    <div className="space-y-6">
      <div className="card p-1.5 flex flex-wrap gap-1">
        {forms.map((form) => (
          <button
            key={form.id}
            onClick={() => setActiveForm(form.id)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeForm === form.id
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {form.label}
          </button>
        ))}
      </div>

      {activeForm === "topics" && (
        <DeepDiveTopics isAdmin={isAdmin || isModerator || false} />
      )}
      {activeForm === "planner" && (
        <DeepDivePlanner
          plan={plan}
          setPlan={setPlan}
          isAdmin={isAdmin || isModerator || false}
          coachName={selectedCoach?.name}
          presenterName={selectedPresenter?.name}
        />
      )}
      {activeForm === "presenter" && (
        <PresenterWorksheet
          presenter={selectedPresenter?.name}
          diveId={plan.presenterId ? "current" : undefined}
        />
      )}
      {activeForm === "coach-cheat" && <CoachCheatSheet />}
      {activeForm === "coach-intro" && (
        <CoachIntroduction
          presenterName={selectedPresenter?.name}
          diveId={plan.coachId ? "current" : undefined}
        />
      )}
      {activeForm === "scribe" && (
        <IScribeWorksheet
          presenterName={selectedPresenter?.name}
          diveId={plan.presenterId ? "current" : undefined}
        />
      )}
    </div>
  );
}

function DeepDivePlanner({
  plan,
  setPlan,
  isAdmin,
  coachName,
  presenterName,
}: {
  plan: DeepDivePlan;
  setPlan: (plan: DeepDivePlan) => void;
  isAdmin: boolean;
  coachName?: string;
  presenterName?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const handleSave = async () => {
    if (!plan.coachId || !plan.presenterId) {
      alert("Please select both a coach and presenter");
      return;
    }
    if (plan.coachId === plan.presenterId) {
      alert("Coach and presenter must be different people");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (response.ok) {
        alert("Deep Dive planned successfully");
      } else {
        alert("Failed to save");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const generateICSFile = () => {
    if (!plan.coachingDate || !plan.coachingTime || !coachName || !presenterName) {
      alert("Please fill in date, time, coach, and presenter before generating invite");
      return;
    }

    const startDate = new Date(`${plan.coachingDate}T${convertTo24Hour(plan.coachingTime)}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//${siteConfig.forumName}//Deep Dive//EN
BEGIN:VEVENT
UID:${Date.now()}@${siteConfig.domain}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Deep Dive Coaching - ${presenterName}
DESCRIPTION:Deep Dive coaching session.\\n\\nCoach: ${coachName}\\nPresenter: ${presenterName}\\n\\nMeet 1-2 weeks before the Forum Deep Dive, approximately 1 hour, in a comfortable private space.
LOCATION:${plan.coachingLocation || "TBD"}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `deep-dive-coaching-${plan.coachingDate}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openGoogleCalendar = () => {
    if (!plan.coachingDate || !plan.coachingTime || !coachName || !presenterName) {
      alert("Please fill in date, time, coach, and presenter before creating invite");
      return;
    }

    const startDate = new Date(`${plan.coachingDate}T${convertTo24Hour(plan.coachingTime)}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const title = encodeURIComponent(`Deep Dive Coaching - ${presenterName}`);
    const details = encodeURIComponent(
      `Deep Dive coaching session.\n\nCoach: ${coachName}\nPresenter: ${presenterName}\n\nMeet 1-2 weeks before the Forum Deep Dive, approximately 1 hour, in a comfortable private space.`
    );
    const location = encodeURIComponent(plan.coachingLocation || "");
    const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
    window.open(url, "_blank");
  };

  const convertTo24Hour = (time: string): string => {
    if (!time) return "10:00";
    const match = time.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    if (!match) return "10:00";
    let hours = parseInt(match[1]);
    const minutes = match[2] || "00";
    const period = match[3]?.toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  };

  return (
    <div className="card">
      <div className="p-4 border-b border-stone-200">
        <h2 className="font-semibold text-stone-900">Next Deep Dive</h2>
        <p className="text-sm text-stone-500 mt-1">
          Plan the coaching session (1–2 weeks before forum, ~1 hour, in person)
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Coach / Leader
            </label>
            <select
              value={plan.coachId}
              onChange={(e) => setPlan({ ...plan, coachId: e.target.value })}
              className="w-full"
            >
              <option value="">Select coach...</option>
              {INITIAL_MEMBERS.map((m) => (
                <option key={m.id} value={m.id} disabled={m.id === plan.presenterId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Presenter
            </label>
            <select
              value={plan.presenterId}
              onChange={(e) => setPlan({ ...plan, presenterId: e.target.value })}
              className="w-full"
            >
              <option value="">Select presenter...</option>
              {INITIAL_MEMBERS.map((m) => (
                <option key={m.id} value={m.id} disabled={m.id === plan.coachId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Coaching Date
            </label>
            <input
              type="date"
              value={plan.coachingDate}
              onChange={(e) => setPlan({ ...plan, coachingDate: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Time
            </label>
            <input
              type="text"
              value={plan.coachingTime}
              onChange={(e) => setPlan({ ...plan, coachingTime: e.target.value })}
              placeholder="e.g., 10:00 AM"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Location
            </label>
            <AddressAutocomplete
              value={plan.coachingLocation}
              onChange={(coachingLocation) => setPlan({ ...plan, coachingLocation })}
              placeholder="In person location"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Forum Meeting (optional)
          </label>
          <select
            value={plan.meetingId}
            onChange={(e) => setPlan({ ...plan, meetingId: e.target.value })}
            className="w-full"
          >
            <option value="">Not linked to a meeting</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Status
          </label>
          <div className="flex gap-4">
            {[
              { value: "scheduled", label: "Scheduled" },
              { value: "happened", label: "Coaching Happened" },
              { value: "forms_complete", label: "Forms Complete" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center text-sm">
                <input
                  type="radio"
                  name="status"
                  value={opt.value}
                  checked={plan.coachingStatus === opt.value}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      coachingStatus: e.target.value as DeepDivePlan["coachingStatus"],
                    })
                  }
                  className="mr-2"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Calendar Invite Section */}
        {isAdmin && plan.coachId && plan.presenterId && plan.coachingDate && (
          <div className="bg-amber-50 border border-amber-200 rounded p-4">
            <h3 className="font-medium text-amber-900 mb-2">Send Calendar Invite</h3>
            <p className="text-sm text-amber-700 mb-3">
              Create a calendar invite for the coaching session. This will not auto-send—you control when to share it.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openGoogleCalendar}
                className="btn btn-accent text-sm"
              >
                Open in Google Calendar
              </button>
              <button
                type="button"
                onClick={generateICSFile}
                className="btn btn-ghost text-sm"
              >
                Download .ics File
              </button>
            </div>
          </div>
        )}

        <div className="bg-stone-50 rounded p-3 text-sm text-stone-600">
          <strong>EO Practice:</strong> The coaching session happens 1–2 weeks before the forum Deep Dive, 
          approximately 1 hour, in a comfortable private space. The coach and presenter meet to help 
          organize thoughts and dive into the complexities of the presenter's situation.
        </div>
      </div>

      <div className="p-4 border-t border-stone-200 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !plan.coachId || !plan.presenterId}
          className="btn btn-primary"
        >
          {saving ? "Saving..." : "Save Plan"}
        </button>
      </div>
    </div>
  );
}

function PresenterWorksheet({ presenter, diveId }: { presenter?: string; diveId?: string }) {
  const [form, setForm] = useState({
    headline: "",
    contextBackground: "",
    contextCurrent: "",
    contextNextSteps: "",
    struggleHardest: "",
    struggleContribution: "",
    struggleStuck: "",
    struggleChange: "",
    feelingsFear: "",
    feelingsTable: [{ feeling: "", thoughts: "" }, { feeling: "", thoughts: "" }, { feeling: "", thoughts: "" }, { feeling: "", thoughts: "" }],
    feelingsMetaphor: "",
    lookingHope: "",
    lookingFail: "",
    lookingSuccess: "",
    lookingBeliefs: "",
    lookingCoreDilemma: "",
  });
  const [saving, setSaving] = useState(false);

  const updateFeelingRow = (index: number, field: "feeling" | "thoughts", value: string) => {
    const newTable = [...form.feelingsTable];
    newTable[index][field] = value;
    setForm({ ...form, feelingsTable: newTable });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/deep-dive/presenter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, diveId }),
      });
      if (response.ok) {
        alert("Worksheet saved");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="eo-worksheet">
      <div className="eo-masthead">
        <span className="eo-category">Forum Training | Worksheets</span>
        <h1 className="eo-title">DEEP DIVE | PRESENTER'S WORKSHEET</h1>
      </div>

      <div className="eo-intro">
        Complete prior to your coaching session to help you organize your thoughts and dive into the 
        complexities of your situation. You can use this structure as a basic outline for your Deep Dive. 
        You may rework or update the document after your coaching session to include deeper issues uncovered.
      </div>

      <div className="eo-section">
        <div className="eo-section-title">1. HEADLINE or SUMMARY STATEMENT</div>
        <div className="eo-section-subtitle">What do I want to explore with the Forum?</div>
        <textarea
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          rows={3}
          className="eo-lined-textarea"
        />
      </div>

      <div className="eo-section">
        <div className="eo-section-title">2. CONTEXT</div>
        <div className="eo-field">
          <label className="eo-field-label">a. Background:</label>
          <textarea
            value={form.contextBackground}
            onChange={(e) => setForm({ ...form, contextBackground: e.target.value })}
            rows={3}
            className="eo-lined-textarea"
          />
        </div>
        <div className="eo-field">
          <label className="eo-field-label">b. Current situation:</label>
          <textarea
            value={form.contextCurrent}
            onChange={(e) => setForm({ ...form, contextCurrent: e.target.value })}
            rows={3}
            className="eo-lined-textarea"
          />
        </div>
        <div className="eo-field">
          <label className="eo-field-label">c. Next steps I am considering:</label>
          <textarea
            value={form.contextNextSteps}
            onChange={(e) => setForm({ ...form, contextNextSteps: e.target.value })}
            rows={3}
            className="eo-lined-textarea"
          />
        </div>
      </div>

      <div className="eo-section">
        <div className="eo-section-title">3. DIVING DEEPER INTO MY STRUGGLE</div>
        <div className="eo-field">
          <label className="eo-field-label">a. What is hardest for me?</label>
          <textarea
            value={form.struggleHardest}
            onChange={(e) => setForm({ ...form, struggleHardest: e.target.value })}
            rows={3}
            className="eo-lined-textarea"
          />
        </div>
        <div className="eo-field">
          <label className="eo-field-label">b. How might my own actions be contributing to the challenge I face?</label>
          <textarea
            value={form.struggleContribution}
            onChange={(e) => setForm({ ...form, struggleContribution: e.target.value })}
            rows={3}
            className="eo-lined-textarea"
          />
        </div>
        <div className="eo-field">
          <label className="eo-field-label">c. Where am I stuck?</label>
          <textarea
            value={form.struggleStuck}
            onChange={(e) => setForm({ ...form, struggleStuck: e.target.value })}
            rows={3}
            className="eo-lined-textarea"
          />
        </div>
        <div className="eo-field">
          <label className="eo-field-label">d. What do I most want to change?</label>
          <textarea
            value={form.struggleChange}
            onChange={(e) => setForm({ ...form, struggleChange: e.target.value })}
            rows={3}
            className="eo-lined-textarea"
          />
        </div>
      </div>

      <div className="eo-section">
        <div className="eo-section-title">4. MY FEELINGS</div>
        <div className="eo-field">
          <label className="eo-field-label">a. My strongest fear/uncertainty/concern:</label>
          <textarea
            value={form.feelingsFear}
            onChange={(e) => setForm({ ...form, feelingsFear: e.target.value })}
            rows={2}
            className="eo-lined-textarea"
          />
        </div>

        <table className="eo-feelings-table">
          <thead>
            <tr>
              <th style={{ width: "35%" }}>FEELINGS/EMOTIONS</th>
              <th>WHERE ARE THESE FEELINGS COMING FROM?<br/>THOUGHTS/STORY CREATING THESE FEELINGS...</th>
            </tr>
          </thead>
          <tbody>
            {form.feelingsTable.map((row, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    value={row.feeling}
                    onChange={(e) => updateFeelingRow(i, "feeling", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.thoughts}
                    onChange={(e) => updateFeelingRow(i, "thoughts", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="eo-field" style={{ marginTop: "1rem" }}>
          <label className="eo-field-label">b. A metaphor or image that comes to mind that describes my situation:</label>
          <textarea
            value={form.feelingsMetaphor}
            onChange={(e) => setForm({ ...form, feelingsMetaphor: e.target.value })}
            rows={2}
            className="eo-lined-textarea"
          />
        </div>
      </div>

      <div className="eo-section">
        <div className="eo-section-title">5. LOOKING FORWARD</div>
        <div className="eo-field">
          <label className="eo-field-label">a. My hope, dream, or ideal outcome is...</label>
          <textarea
            value={form.lookingHope}
            onChange={(e) => setForm({ ...form, lookingHope: e.target.value })}
            rows={2}
            className="eo-lined-textarea"
          />
        </div>
        <div className="eo-field">
          <label className="eo-field-label">b. What would failing mean for me and those around me?</label>
          <textarea
            value={form.lookingFail}
            onChange={(e) => setForm({ ...form, lookingFail: e.target.value })}
            rows={2}
            className="eo-lined-textarea"
          />
        </div>
        <div className="eo-field">
          <label className="eo-field-label">c. What would success mean for me and those around me?</label>
          <textarea
            value={form.lookingSuccess}
            onChange={(e) => setForm({ ...form, lookingSuccess: e.target.value })}
            rows={2}
            className="eo-lined-textarea"
          />
        </div>
        <div className="eo-field">
          <label className="eo-field-label">d. Are there any beliefs or biases I might need to shift in order to get what I want?</label>
          <textarea
            value={form.lookingBeliefs}
            onChange={(e) => setForm({ ...form, lookingBeliefs: e.target.value })}
            rows={2}
            className="eo-lined-textarea"
          />
        </div>
        <div className="eo-field">
          <label className="eo-field-label">e. My core opportunity or dilemma might be...</label>
          <textarea
            value={form.lookingCoreDilemma}
            onChange={(e) => setForm({ ...form, lookingCoreDilemma: e.target.value })}
            rows={2}
            className="eo-lined-textarea"
          />
        </div>
      </div>

      <div className="eo-footer">
        <div className="eo-logo">
          <span className="eo-logo-e">E</span>
          <span className="eo-logo-o">O</span>
        </div>
        <div className="eo-actions print-hide">
          <button onClick={handleSave} disabled={saving} className="eo-btn eo-btn-primary">
            {saving ? "Saving..." : "Save Worksheet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CoachCheatSheet() {
  return (
    <div className="eo-worksheet">
      <div className="eo-masthead">
        <span className="eo-category">Forum Training | Worksheets</span>
        <h1 className="eo-title">DEEP DIVE | COACH'S CHEAT SHEET</h1>
      </div>

      <div className="eo-intro">
        Coaching supports powerful Deep Dives that focus on our inner struggle, rather than details of 
        my story/situation. My Forum mates listen to connect to their own resonant memories or struggles 
        and share those vulnerably.
      </div>

      <div className="p-4 grid md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="eo-card">
            <div className="eo-card-title" style={{ textAlign: "left", color: "#374151" }}>Prepare</div>
            <ul>
              <li>Coach and presenter meet one to two weeks BEFORE Forum Deep Dive (not day of meeting).</li>
              <li>Meet in a comfortable, private space.</li>
              <li>Plan for an uninterrupted hour.</li>
            </ul>
          </div>

          <div className="eo-card">
            <div className="eo-card-title">COACHING MINDSET</div>
            <ul>
              <li>Listen curiously to help find the inner struggle beneath the current situation</li>
              <li>Reflect back what you hear and notice</li>
              <li>Silence is powerful; listen more than speak</li>
              <li>No problem solving or experience sharing</li>
              <li>Emotions lead to depth</li>
            </ul>
          </div>

          <div className="eo-card" style={{ background: "#fef3c7", borderColor: "#fcd34d" }}>
            <div className="eo-card-title" style={{ color: "#92400e" }}>FOUR STEPS OF COACHING</div>
            <div className="eo-steps">
              <div className="eo-step">
                <span className="eo-step-number">1</span>
                <div className="eo-step-content">
                  <div className="eo-step-title">Quiet Mind</div>
                  <div className="eo-step-desc">Resist solving. Just listen.</div>
                </div>
              </div>
              <div className="eo-step">
                <span className="eo-step-number">2</span>
                <div className="eo-step-content">
                  <div className="eo-step-title">Reflecting Back</div>
                  <div className="eo-step-desc">Repeat what you hear, see, notice</div>
                </div>
              </div>
              <div className="eo-step">
                <span className="eo-step-number">3</span>
                <div className="eo-step-content">
                  <div className="eo-step-title">Listen For the Struggle BENEATH the Story</div>
                  <div className="eo-step-desc">Where is the challenge?</div>
                </div>
              </div>
              <div className="eo-step">
                <span className="eo-step-number">4</span>
                <div className="eo-step-content">
                  <div className="eo-step-title">Focus</div>
                  <div className="eo-step-desc">Which struggle is strongest?</div>
                </div>
              </div>
            </div>
          </div>

          <div className="eo-card">
            <div className="eo-card-title">SAMPLE COACHING QUESTIONS</div>
            <ul>
              <li>What's on your mind?</li>
              <li>What are your strongest emotions about this? (ask at different points of the conversation)</li>
              <li>What is the real challenge?</li>
              <li>What question do you hope to answer for yourself?</li>
              <li>Of everything you've shared, what are you most troubled by, uncertain about, or stumped by?</li>
              <li>What do you want?</li>
              <li>If you could wave a magic wand, what would it look like?</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="eo-card">
            <div className="eo-card-title">COACHING TIPS</div>
            <ul>
              <li>Ask open-ended questions, "Tell me more..." "Help me understand..." "Why..."</li>
              <li>Notice body language or tone of voice and inquire as to meaning</li>
              <li>Listen for powerful words or metaphors</li>
              <li>Where does the conversation return to, repeatedly?</li>
              <li>What emotions are most powerful? What lies beneath them?</li>
            </ul>
          </div>

          {/* Iceberg Diagram */}
          <div className="eo-card" style={{ background: "#eff6ff", borderColor: "#93c5fd" }}>
            <div className="eo-card-title" style={{ color: "#1e40af" }}>The Iceberg</div>
            <div className="relative">
              <div style={{ background: "#dbeafe", borderRadius: "50% 50% 0 0", padding: "1rem", textAlign: "center", borderBottom: "2px solid #60a5fa" }}>
                <p style={{ fontSize: "0.625rem", color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.05em" }}>VISIBLE 20%</p>
                <p style={{ fontWeight: "600", color: "#1e40af", fontSize: "0.875rem" }}>DATA</p>
                <p style={{ fontSize: "0.6875rem", color: "#2563eb" }}>The story</p>
                <div style={{ fontSize: "0.625rem", color: "#3b82f6", marginTop: "0.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.25rem" }}>
                  <span>What happened?</span>
                  <span>Who?</span>
                  <span>What was said?</span>
                  <span>When?</span>
                  <span>Where?</span>
                </div>
              </div>
              <div style={{ background: "#bfdbfe", borderRadius: "0 0 0.5rem 0.5rem", padding: "1rem", textAlign: "center" }}>
                <p style={{ fontSize: "0.625rem", color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.05em" }}>INVISIBLE 80%</p>
                <p style={{ fontWeight: "600", color: "#1e40af", fontSize: "0.875rem" }}>EMOTION</p>
                <p style={{ fontSize: "0.6875rem", color: "#2563eb" }}>The inner struggle</p>
                <div style={{ fontSize: "0.625rem", color: "#1d4ed8", marginTop: "0.5rem" }}>
                  <p>Body sensations • Feelings</p>
                  <p>Inner desires • Core needs</p>
                  <p>Beliefs • Values</p>
                  <p>Triggers & tension points</p>
                  <p style={{ fontWeight: "600", paddingTop: "0.25rem" }}>Core struggles</p>
                </div>
                <p style={{ fontSize: "0.625rem", color: "#3b82f6", marginTop: "0.5rem", fontWeight: "500" }}>QUESTION OF ESSENCE</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="eo-footer">
        <div className="eo-logo">
          <span className="eo-logo-e">E</span>
          <span className="eo-logo-o">O</span>
        </div>
        <div className="eo-actions print-hide">
          <button onClick={() => window.print()} className="eo-btn eo-btn-secondary">
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

function CoachIntroduction({ presenterName, diveId }: { presenterName?: string; diveId?: string }) {
  const [form, setForm] = useState({
    coreOpportunity: "",
    strugglesHeard: "",
    feelingsHeard: "",
    communicationFeeling: "",
    communicationSituation: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/deep-dive/coach-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, diveId }),
      });
      if (response.ok) {
        alert("Introduction saved");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="eo-worksheet">
      <div className="eo-masthead">
        <span className="eo-category">Forum Training | Worksheets</span>
        <h1 className="eo-title">DEEP DIVE | COACH'S INTRODUCTION</h1>
      </div>

      <div className="eo-section">
        <div className="eo-section-title">INTRODUCTION</div>
        <div className="eo-section-subtitle">The core of this opportunity or challenge? (A single sentence, in the PRESENTER'S words)</div>
        <textarea
          value={form.coreOpportunity}
          onChange={(e) => setForm({ ...form, coreOpportunity: e.target.value })}
          rows={4}
          className="eo-lined-textarea"
        />
      </div>

      <div className="eo-section">
        <div className="eo-field-label" style={{ marginBottom: "0.5rem" }}>The struggle(s) beneath this story I heard:</div>
        <textarea
          value={form.strugglesHeard}
          onChange={(e) => setForm({ ...form, strugglesHeard: e.target.value })}
          rows={5}
          className="eo-lined-textarea"
        />
      </div>

      <div className="eo-section">
        <div className="eo-field-label" style={{ marginBottom: "0.5rem" }}>Feelings I heard:</div>
        <textarea
          value={form.feelingsHeard}
          onChange={(e) => setForm({ ...form, feelingsHeard: e.target.value })}
          rows={5}
          className="eo-lined-textarea"
        />
      </div>

      <div className="eo-section">
        <div className="eo-section-title">COMMUNICATION STARTER</div>
        <p style={{ fontSize: "0.8125rem", color: "#374151", marginBottom: "1rem" }}>
          Think of a time when you felt <span style={{ borderBottom: "1px solid #d1d5db", padding: "0 2rem" }}></span> (presenter's strongest feeling)
          <br />
          because <span style={{ borderBottom: "1px solid #d1d5db", padding: "0 2rem" }}></span> (a general description of the situation).
        </p>
        <div style={{ background: "#f9fafb", borderRadius: "0.375rem", padding: "0.75rem", marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.8125rem", color: "#4b5563" }}>
            <strong>Example:</strong> Remember a time when you felt <span style={{ textDecoration: "underline" }}>frustrated</span> because{" "}
            <span style={{ textDecoration: "underline" }}>an important person in your life was holding you back</span>.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label className="eo-field-label">Presenter's strongest feeling</label>
            <input
              type="text"
              value={form.communicationFeeling}
              onChange={(e) => setForm({ ...form, communicationFeeling: e.target.value })}
              className="w-full"
              style={{ marginTop: "0.25rem" }}
            />
          </div>
          <div>
            <label className="eo-field-label">General description of situation</label>
            <input
              type="text"
              value={form.communicationSituation}
              onChange={(e) => setForm({ ...form, communicationSituation: e.target.value })}
              className="w-full"
              style={{ marginTop: "0.25rem" }}
            />
          </div>
        </div>
      </div>

      <div className="eo-footer">
        <div className="eo-logo">
          <span className="eo-logo-e">E</span>
          <span className="eo-logo-o">O</span>
        </div>
        <div className="eo-actions print-hide">
          <button onClick={handleSave} disabled={saving} className="eo-btn eo-btn-primary">
            {saving ? "Saving..." : "Save Introduction"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IScribeWorksheet({ presenterName, diveId }: { presenterName?: string; diveId?: string }) {
  const [form, setForm] = useState({
    notes: "",
    experiences: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/deep-dive/scribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, diveId }),
      });
      if (response.ok) {
        alert("Notes saved");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="eo-worksheet">
      <div className="eo-masthead">
        <span className="eo-category">Forum Training | Worksheets</span>
        <h1 className="eo-title">DEEP DIVE | I-SCRIBE WORKSHEET</h1>
      </div>

      <div className="eo-intro">
        Use this worksheet during a Deep Dive to capture notes or key themes that you hear and issues/opportunities 
        where you resonate with the presenter. Use the space below to organize your own thoughts for experience 
        sharing with the Forum.
      </div>

      <div className="eo-box">
        <div className="eo-box-title">NOTES</div>
        <div className="eo-box-content">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={10}
          />
        </div>
      </div>

      <div className="eo-box">
        <div className="eo-box-title">EXPERIENCES</div>
        <div className="eo-box-content">
          <textarea
            value={form.experiences}
            onChange={(e) => setForm({ ...form, experiences: e.target.value })}
            rows={10}
          />
        </div>
      </div>

      <div className="eo-footer">
        <div className="eo-logo">
          <span className="eo-logo-e">E</span>
          <span className="eo-logo-o">O</span>
        </div>
        <div className="eo-actions print-hide">
          <button onClick={handleSave} disabled={saving} className="eo-btn eo-btn-primary">
            {saving ? "Saving..." : "Save Notes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTopicDate(date: string | null): string {
  if (!date) return "No date";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return date;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return format(new Date(year, month - 1, day), "MMM d, yyyy");
}

function DeepDiveTopics({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<DeepDiveTopicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    memberId: "",
    noteText: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/deep-dive-topics");
        if (response.ok && !cancelled) {
          const data = await response.json();
          setItems(data.items || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch deep dive topics:", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/deep-dive-topics");
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch deep dive topics:", error);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.noteText.trim()) {
      alert("Please enter a topic");
      return;
    }

    const member = newItem.memberId
      ? INITIAL_MEMBERS.find((m) => m.id === newItem.memberId)
      : null;

    const itemData = {
      memberId: newItem.memberId || null,
      memberName: member?.name || null,
      date: newItem.date,
      noteText: newItem.noteText,
    };

    setNewItem({
      date: format(new Date(), "yyyy-MM-dd"),
      memberId: "",
      noteText: "",
    });
    setShowAddForm(false);

    try {
      const response = await fetch("/api/deep-dive-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Remove this topic from the list?")) return;
    
    setItems((current) => current.filter((item) => item.id !== id));

    try {
      const response = await fetch(`/api/deep-dive-topics/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to delete topic:", error);
      await fetchData();
    }
  };

  const activeItems = useMemo(() => {
    return items.filter((item) => item.status === "converted-deep-dive");
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-stone-900">Deep Dive Topics</h2>
            <p className="text-sm text-stone-500 mt-1">
              Topics awaiting Deep Dive discussion
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary text-sm"
          >
            {showAddForm ? "Cancel" : "Add Topic"}
          </button>
        </div>

        {showAddForm && (
          <div className="p-4 border-b border-stone-200 bg-stone-50">
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newItem.date}
                    onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Person (optional)</label>
                  <select
                    value={newItem.memberId}
                    onChange={(e) => setNewItem({ ...newItem, memberId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Group topic</option>
                    {INITIAL_MEMBERS.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Topic *</label>
                <textarea
                  value={newItem.noteText}
                  onChange={(e) => setNewItem({ ...newItem, noteText: e.target.value })}
                  rows={2}
                  className="w-full"
                  placeholder="Enter the deep dive topic..."
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddItem}
                  disabled={!newItem.noteText.trim()}
                  className="btn btn-primary"
                >
                  Add Topic
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-4">
          {isLoading ? (
            <div className="py-8 text-center">
              <p className="text-stone-500">Loading...</p>
            </div>
          ) : activeItems.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-stone-500 mb-2">No topics awaiting Deep Dive</p>
              <p className="text-sm text-stone-400">
                Convert topics from the Parking Lot using → Deep Dive, or add a new topic above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeItems.map((item) => (
                <div key={item.id} className="p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {item.memberName && (
                        <span className="text-xs text-stone-500 block mb-1">{item.memberName}</span>
                      )}
                      <p className="text-stone-900">{item.noteText}</p>
                      <p className="text-xs text-stone-400 mt-1">{formatTopicDate(item.date)}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-stone-50 rounded-lg p-4 text-sm text-stone-600">
        <strong>How it works:</strong> Topics can be added from the Parking Lot by clicking 
        &quot;→ Deep Dive&quot;, or added directly here. Once a topic is selected for the next 
        Deep Dive, use the Plan tab to schedule the coaching session and assign presenter and coach.
      </div>
    </div>
  );
}
