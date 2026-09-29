import Navbar from "@/components/Navbar";
import RedemptionTable from "@/components/campaigns/RedemptionTable";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export default async function CampaignRedemptionsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  await requireAdminPageAccess();
  const { campaignId } = await params;

  return (
    <main>
      <Navbar mode="admin" />
      <div className="h-24 md:h-28" />
      <RedemptionTable campaignId={campaignId} />
    </main>
  );
}