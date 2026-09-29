import Navbar from "@/components/Navbar";
import FanRequestTable from "@/components/campaigns/FanRequestTable";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export default async function CampaignRequestsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  await requireAdminPageAccess();
  const { campaignId } = await params;

  return (
    <main>
      <Navbar mode="admin" />
      <div className="h-24 md:h-28" />
      <FanRequestTable campaignId={campaignId} />
    </main>
  );
}