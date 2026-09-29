import Navbar from "@/components/Navbar";
import CouponAdminDashboard from "@/components/CouponAdminDashboard";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export default async function CouponAdminPage() {
  await requireAdminPageAccess();

  return (
    <main>
      <Navbar mode="admin" />
      <div className="h-24 md:h-28" />
      <CouponAdminDashboard />
    </main>
  );
}
