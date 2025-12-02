import { useEffect } from "react";
import { useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MeshBackground } from "@/components/mesh-background";
import { useRequireAuth } from "@/hooks/use-session";
import { Loader2 } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading, logout } = useRequireAuth();
  const [, setLocation] = useLocation();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <>
        <MeshBackground />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <MeshBackground />
      <SidebarProvider style={style}>
        <div className="flex h-screen w-full relative z-10">
          <AppSidebar onLogout={logout} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center gap-4 p-4 border-b border-white/10 bg-background/50 backdrop-blur-sm">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground">
                {user.username}
              </span>
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
