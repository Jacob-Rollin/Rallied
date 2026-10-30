import type { Metadata } from "next";
import { BRAND } from "@rallied/shared";
import { OpsChrome } from "@/components/OpsChrome";

export const metadata: Metadata = {
  title: `Ops — ${BRAND.name}`,
  description: "Rallied staff feedback inbox",
  robots: { index: false, follow: false },
};

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate text-white">
      <OpsChrome />
      {children}
    </div>
  );
}
