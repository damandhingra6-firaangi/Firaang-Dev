import Navbar from "@/components/Navbar";
import FeedbackAdminDashboard from "@/components/FeedbackAdminDashboard";

export default function FeedbackAdminPage() {
  return (
    <main>
      <Navbar />
      <div className="h-24 md:h-28" />
      <FeedbackAdminDashboard />
    </main>
  );
}
