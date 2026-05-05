import Topbar from "@/components/layout/Topbar";

export default function MockupsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
