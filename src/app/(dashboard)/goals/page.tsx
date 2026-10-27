import { PageHeader } from "@/components/page-header";
import { GoalsClient } from "./goals-client";

export default function GoalsPage() {
  return (
    <div>
      <PageHeader
        title="Goals"
        description="1, 6, and 12-month goal tracking"
      />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <GoalsClient />
      </div>
    </div>
  );
}
