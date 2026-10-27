import { PageHeader } from "@/components/page-header";
import { getForumMembers } from "@/lib/members-query";
import { MembersClient } from "./members-client";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const members = await getForumMembers();

  return (
    <div>
      <PageHeader
        title="Members"
        description="Forum roster, bios, and birthdays"
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <MembersClient members={members} />
      </div>
    </div>
  );
}
