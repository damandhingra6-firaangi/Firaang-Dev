import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Profile",
  description: "Manage your Firaang profile settings.",
  path: "/profile",
  noIndex: true,
});

export default function ProfilePage() {
  redirect("/account?tab=profile");
}
