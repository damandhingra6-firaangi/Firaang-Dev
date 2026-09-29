import Navbar from "@/components/Navbar";
import CampaignList from "@/components/campaigns/CampaignList";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export default async function CampaignsAdminPage() {
  await requireAdminPageAccess();

  return (
    <main>
      <Navbar mode="admin" />
      <div className="h-24 md:h-28" />
      <CampaignList />
    </main>
  );
}