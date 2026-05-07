import HydrationGate from "@/components/layout/HydrationGate";
import Topbar from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HydrationGate>
      <div className="min-h-screen flex flex-col">
        <Topbar />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </HydrationGate>
  );
}
