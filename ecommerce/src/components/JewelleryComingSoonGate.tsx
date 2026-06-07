"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import JewelleryComingSoonModal from "@/components/JewelleryComingSoonModal";

type JewelleryComingSoonGateProps = {
  backHref?: string;
};

export default function JewelleryComingSoonGate({ backHref = "/shop" }: JewelleryComingSoonGateProps) {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.push(backHref);
    }, 240);

    return () => window.clearTimeout(timeoutId);
  }, [backHref, isOpen, router]);

  return <JewelleryComingSoonModal isOpen={isOpen} onClose={() => setIsOpen(false)} />;
}