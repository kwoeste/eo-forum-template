import { PageHeader } from "@/components/page-header";
import { INITIAL_MEMBERS } from "@/lib/members-data";
import { LifelineClient } from "./lifeline-client";

export default function LifelinePage() {
  return (
    <div>
      <PageHeader
        title="Timelines / Lifelines"
        description="Member timeline documents and personal histories"
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LifelineClient initialMembers={INITIAL_MEMBERS} />
      </div>
    </div>
  );
}
