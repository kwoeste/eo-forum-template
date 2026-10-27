import { PageHeader } from "@/components/page-header";
import { DeepDiveClient } from "./deep-dive-client";

export default function DeepDivePage() {
  return (
    <div>
      <PageHeader
        title="Deep Dive"
        description="Presenter, Coach, and I-Scribe worksheets"
      />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <DeepDiveClient />
      </div>
    </div>
  );
}
