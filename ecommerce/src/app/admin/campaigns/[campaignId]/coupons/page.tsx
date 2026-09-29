import Navbar from "@/components/Navbar";
import CouponTable from "@/components/campaigns/CouponTable";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export default async function CampaignCouponsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  await requireAdminPageAccess();
  const { campaignId } = await params;

  return (
    <main>
      <Navbar mode="admin" />
      <div className="h-24 md:h-28" />
      <CouponTable campaignId={campaignId} />
    </main>
  );
}