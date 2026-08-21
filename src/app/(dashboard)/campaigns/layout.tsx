import { CampaignsNav } from "@/components/campaigns/campaigns-nav";

export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <CampaignsNav />
      {children}
    </div>
  );
}
