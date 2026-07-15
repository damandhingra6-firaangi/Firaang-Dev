import Navbar from "@/components/Navbar";
import AnalyticsAdminDashboard from "@/components/AnalyticsAdminDashboard";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export default async function AnalyticsAdminPage() {
  await requireAdminPageAccess();

  return (
    <main>
      <Navbar />
      <div className="h-24 md:h-28" />
      <AnalyticsAdminDashboard />
    </main>
  );
}
