import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MeshBackground } from "@/components/mesh-background";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <>
      <MeshBackground />
      <SidebarProvider style={style}>
        <div className="flex h-screen w-full relative z-10">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center gap-4 p-4 border-b border-white/10 bg-background/50 backdrop-blur-sm">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex-1" />
            </header>
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
