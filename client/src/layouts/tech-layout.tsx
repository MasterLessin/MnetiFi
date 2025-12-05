import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  Users,
  Router,
  Wifi,
  LogOut,
  Menu,
  X,
  User,
  Settings,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";

interface TechLayoutProps {
  children: React.ReactNode;
}

interface SessionData {
  user: {
    id: string;
    username: string;
    role: string;
    tenantId: string;
  };
  tenant?: {
    id: string;
    name: string;
  };
}

const menuItems = [
  {
    title: "Dashboard",
    url: "/tech",
    icon: Wrench,
  },
  {
    title: "PPPoE Users",
    url: "/tech/pppoe-users",
    icon: Router,
  },
  {
    title: "Static IP Users",
    url: "/tech/static-users",
    icon: Wifi,
  },
  {
    title: "All Customers",
    url: "/tech/customers",
    icon: Users,
  },
];

export function TechLayout({ children }: TechLayoutProps) {
  const [location] = useLocation();

  const { data: session } = useQuery<SessionData>({
    queryKey: ["/api/auth/session"],
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <>
      <MeshBackground />
      <SidebarProvider style={sidebarStyle}>
        <div className="flex h-screen w-full relative z-10">
          <Sidebar className="border-r border-white/10">
            <SidebarHeader className="p-4 border-b border-white/10">
              <MnetiFiLogo size="sm" />
              <Badge variant="outline" className="mt-2 bg-amber-500/20 text-amber-400 border-amber-500/30">
                <Wrench size={12} className="mr-1" />
                Technician Portal
              </Badge>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.url}
                        >
                          <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}>
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
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <User size={18} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {session?.user?.username || "Technician"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session?.tenant?.name || "Loading..."}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-white/20"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </Button>
            </SidebarFooter>
          </Sidebar>

          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between gap-4 p-4 border-b border-white/10 bg-background/50 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div>
                  <h1 className="text-lg font-semibold text-white">Technician Portal</h1>
                  <p className="text-xs text-muted-foreground">
                    Manage PPPoE & Static IP customers
                  </p>
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
