import { PageHeader } from "@/components/page-header";
import { ParkingLotClient } from "./parking-lot-client";

export default function ParkingLotPage() {
  return (
    <div>
      <PageHeader
        title="Parking Lot"
        description="Topics awaiting discussion"
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ParkingLotClient />
      </div>
    </div>
  );
}
