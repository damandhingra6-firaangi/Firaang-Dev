import Navbar from "@/components/Navbar";
import NewsletterAdminDashboard from "@/components/NewsletterAdminDashboard";

export default function NewsletterAdminPage() {
  return (
    <main>
      <Navbar mode="admin" />
      <div className="h-24 md:h-28" />
      <NewsletterAdminDashboard />
    </main>
  );
}
