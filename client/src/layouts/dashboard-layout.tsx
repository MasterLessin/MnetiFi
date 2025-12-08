import { useEffect } from "react";
import { useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MeshBackground } from "@/components/mesh-background";
import { useRequireAuth } from "@/hooks/use-session";
import { Loader2, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading, logout, subscriptionTier, trialExpiresAt } = useRequireAuth();
  const [location, setLocation] = useLocation();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  const isTrialExpired = trialExpiresAt && new Date(trialExpiresAt) < new Date();
  const isBasicTier = subscriptionTier === "BASIC";

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (!isLoading && user && isBasicTier && isTrialExpired && location !== "/dashboard/upgrade") {
      setLocation("/dashboard/upgrade");
    }
  }, [isLoading, user, isBasicTier, isTrialExpired, location, setLocation]);

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

  const getTrialTimeRemaining = () => {
    if (!trialExpiresAt || !isBasicTier) return null;
    const now = new Date();
    const expiry = new Date(trialExpiresAt);
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  const trialTime = getTrialTimeRemaining();

  return (
    <>
      <MeshBackground />
      <SidebarProvider style={style}>
        <div className="flex h-screen w-full relative z-10">
          <AppSidebar onLogout={logout} subscriptionTier={subscriptionTier} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center gap-4 p-4 border-b border-white/10 bg-background/50 backdrop-blur-sm">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex-1" />
              {isBasicTier && trialTime && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${trialTime === "Expired" ? "border-red-500/50 text-red-400" : "border-cyan-500/50 text-cyan-400"}`}
                  data-testid="badge-trial-time"
                >
                  Trial: {trialTime}
                </Badge>
              )}
              {!isBasicTier && (
                <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-0">
                  <Crown size={12} className="mr-1" />
                  Premium
                </Badge>
              )}
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
