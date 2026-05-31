import Navbar from "@/components/Navbar";
import OrderAdminDashboard from "@/components/OrderAdminDashboard";

export default function OrdersAdminPage() {
  return (
    <main>
      <Navbar />
      <div className="h-24 md:h-28" />
      <OrderAdminDashboard />
    </main>
  );
}