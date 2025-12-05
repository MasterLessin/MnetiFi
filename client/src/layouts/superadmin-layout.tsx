import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { MeshBackground } from "@/components/mesh-background";
import { useRequireAuth } from "@/hooks/use-session";
import { Loader2, Building2, LayoutDashboard, Users, LogOut, Shield, UserCog } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { title: "Dashboard", url: "/superadmin", icon: LayoutDashboard },
  { title: "Tenants", url: "/superadmin/tenants", icon: Building2 },
  { title: "Users", url: "/superadmin/users", icon: UserCog },
];

function SuperAdminSidebar({ onLogout }: { onLogout: () => void }) {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
            <Shield size={20} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="font-bold text-white">Super Admin</h2>
            <p className="text-xs text-muted-foreground">Platform Control</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    className="data-[active=true]:bg-sidebar-accent"
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                      <item.icon size={18} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="w-full mb-2" data-testid="button-switch-to-tenant">
            <Building2 size={16} className="mr-2" />
            Tenant Dashboard
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-muted-foreground" 
          onClick={onLogout}
          data-testid="button-logout"
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { user, isLoading, logout } = useRequireAuth();
  const [, setLocation] = useLocation();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/superadmin/login");
    } else if (!isLoading && user && user.role !== "superadmin") {
      setLocation("/superadmin/login");
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

  if (!user || user.role !== "superadmin") {
    return null;
  }

  return (
    <>
      <MeshBackground />
      <SidebarProvider style={style}>
        <div className="flex h-screen w-full relative z-10">
          <SuperAdminSidebar onLogout={logout} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center gap-4 p-4 border-b border-white/10 bg-background/50 backdrop-blur-sm">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-cyan-400" />
                <span className="text-sm text-muted-foreground">
                  {user.username}
                </span>
              </div>
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
