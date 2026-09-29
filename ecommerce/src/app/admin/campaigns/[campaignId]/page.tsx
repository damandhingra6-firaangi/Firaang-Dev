import Navbar from "@/components/Navbar";
import CampaignDetails from "@/components/campaigns/CampaignDetails";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export default async function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  await requireAdminPageAccess();
  const { campaignId } = await params;

  return (
    <main>
      <Navbar mode="admin" />
      <div className="h-24 md:h-28" />
      <CampaignDetails campaignId={campaignId} />
    </main>
  );
}