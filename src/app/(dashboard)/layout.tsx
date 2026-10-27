import { siteConfig, isEmail } from "@/site.config";
import { Navigation } from "@/components/navigation";
import { ProfileGate } from "@/components/profile-gate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileGate>
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="pt-14 lg:pt-0 lg:pl-60 print:pt-0 print:pl-0 min-h-screen flex flex-col">
          <main className="flex-1">{children}</main>
          <footer className="bg-slate-900 text-slate-400 py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center text-sm">
              <p className="font-medium text-white mb-1">{siteConfig.forumName}</p>
              <p className="italic">Nothing, no one, ever.</p>
              <p className="mt-2 text-xs">
                Respect • All in • Own it
              </p>
            </div>
          </footer>
        </div>
      </div>
    </ProfileGate>
  );
}
