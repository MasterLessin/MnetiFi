import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CreditCard,
  Wifi,
  Globe,
  Receipt,
  Settings,
  LogOut,
  ChevronRight,
  Users,
  Ticket,
  FileCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { MnetiFiLogo } from "./mnetifi-logo";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  onLogout?: () => void;
}

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "WiFi Users",
    url: "/dashboard/wifi-users",
    icon: Users,
  },
  {
    title: "Plans",
    url: "/dashboard/plans",
    icon: CreditCard,
  },
  {
    title: "Hotspots",
    url: "/dashboard/hotspots",
    icon: Wifi,
  },
  {
    title: "Transactions",
    url: "/dashboard/transactions",
    icon: Receipt,
  },
  {
    title: "Tickets",
    url: "/dashboard/tickets",
    icon: Ticket,
  },
  {
    title: "Reconciliation",
    url: "/dashboard/reconciliation",
    icon: FileCheck,
  },
  {
    title: "Walled Garden",
    url: "/dashboard/walled-garden",
    icon: Globe,
  },
];

const settingsItems = [
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-white/10 bg-sidebar/50 backdrop-blur-xl">
      <SidebarHeader className="p-4 border-b border-white/10">
        <Link href="/dashboard">
          <MnetiFiLogo size="md" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-3 py-2">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/dashboard" && location.startsWith(item.url));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        "w-full transition-all duration-200",
                        isActive && "bg-white/10 text-white"
                      )}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon size={18} className={isActive ? "text-cyan-400" : ""} />
                        <span>{item.title}</span>
                        {isActive && (
                          <ChevronRight size={14} className="ml-auto text-muted-foreground" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-3 py-2">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = location === item.url;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        "w-full transition-all duration-200",
                        isActive && "bg-white/10 text-white"
                      )}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon size={18} className={isActive ? "text-cyan-400" : ""} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              className="w-full text-muted-foreground hover:text-destructive transition-colors"
              data-testid="nav-logout"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
