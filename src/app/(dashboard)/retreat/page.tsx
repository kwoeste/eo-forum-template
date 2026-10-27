import { PageHeader } from "@/components/page-header";
import { RetreatClient } from "./retreat-client";

export default function RetreatPage() {
  return (
    <div>
      <PageHeader
        title="Retreat"
        description="Annual retreat planning and coordination"
      />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <RetreatClient />
      </div>
    </div>
  );
}
