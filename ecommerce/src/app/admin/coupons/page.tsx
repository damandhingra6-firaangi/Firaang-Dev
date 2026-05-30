import Navbar from "@/components/Navbar";
import CouponAdminDashboard from "@/components/CouponAdminDashboard";

export default function CouponAdminPage() {
  return (
    <main>
      <Navbar />
      <div className="h-24 md:h-28" />
      <CouponAdminDashboard />
    </main>
  );
}
