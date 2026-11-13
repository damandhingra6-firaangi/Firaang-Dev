"use client";

import type { ReactNode } from "react";
import { useAccountStore } from "@/store/useAccountStore";

type AccountPageLayoutProps = {
  sidebar: ReactNode;
  children: ReactNode;
};

export default function AccountPageLayout({ sidebar, children }: AccountPageLayoutProps) {
  const isSignedIn = useAccountStore((state) => state.isSignedIn);

  if (!isSignedIn) {
    return <div>{children}</div>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      {sidebar}
      <div>{children}</div>
    </div>
  );
}
