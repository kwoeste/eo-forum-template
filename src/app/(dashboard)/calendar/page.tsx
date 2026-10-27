import { PageHeader } from "@/components/page-header";
import { getForumMembers } from "@/lib/members-query";
import { CalendarClient } from "./calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const members = await getForumMembers();

  return (
    <div>
      <PageHeader
        title="Meeting Calendar"
        description="Forum meeting schedule"
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <CalendarClient birthdayMembers={members} />
      </div>
    </div>
  );
}
