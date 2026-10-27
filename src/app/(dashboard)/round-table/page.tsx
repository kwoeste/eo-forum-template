import { PageHeader } from "@/components/page-header";
import { RoundTableClient } from "./round-table-client";

export default function RoundTablePage() {
  return (
    <div>
      <PageHeader
        title="Round Table"
        description="Topics for Round Table discussion"
      />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <RoundTableClient />
      </div>
    </div>
  );
}
