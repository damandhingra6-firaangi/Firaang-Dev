"use client";

import CopyButton from "@/components/campaigns/CopyButton";

export default function CopyMessageButton({ message }: { message: string }) {
  return <CopyButton text={message} label="Copy Message" />;
}