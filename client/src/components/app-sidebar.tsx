import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard,
  CreditCard,
  Wifi,
  Globe,
  Receipt,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Users,
  Ticket,
  FileCheck,
  MessageSquare,
  Activity,
  Key,
  Router,
  BarChart3,
  MapPin,
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

interface MenuItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  subItems?: { title: string; url: string; icon: typeof LayoutDashboard }[];
}

const menuItems: MenuItem[] = [
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
    subItems: [
      { title: "Hotspot Plans", url: "/dashboard/hotspot-plans", icon: Wifi },
      { title: "PPPoE Plans", url: "/dashboard/pppoe-plans", icon: Router },
      { title: "Static IP Plans", url: "/dashboard/static-plans", icon: Globe },
    ],
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
    title: "SMS Campaigns",
    url: "/dashboard/sms-campaigns",
    icon: MessageSquare,
  },
  {
    title: "Network Monitoring",
    url: "/dashboard/network-monitoring",
    icon: Activity,
  },
  {
    title: "Vouchers",
    url: "/dashboard/vouchers",
    icon: Key,
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
    title: "Reports",
    url: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    title: "Walled Garden",
    url: "/dashboard/walled-garden",
    icon: Globe,
  },
  {
    title: "Zones",
    url: "/dashboard/zones",
    icon: MapPin,
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
  
  const getAutoExpandedItems = () => {
    return menuItems
      .filter(item => item.subItems?.some(sub => location === sub.url))
      .map(item => item.title);
  };
  
  const [expandedItems, setExpandedItems] = useState<string[]>(getAutoExpandedItems);

  const toggleExpand = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const isSubItemActive = (item: MenuItem) => {
    return item.subItems?.some(sub => location === sub.url) || false;
  };
  
  const isExpanded = (item: MenuItem) => {
    return expandedItems.includes(item.title) || isSubItemActive(item);
  };

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
                  (item.url !== "/dashboard" && location.startsWith(item.url) && !item.subItems);
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const itemIsExpanded = isExpanded(item);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    {hasSubItems ? (
                      <>
                        <SidebarMenuButton
                          onClick={() => toggleExpand(item.title)}
                          className={cn(
                            "w-full transition-all duration-200",
                            (isActive || isSubItemActive(item)) && "bg-white/10 text-white"
                          )}
                          data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <item.icon size={18} className={(isActive || isSubItemActive(item)) ? "text-cyan-400" : ""} />
                          <span>{item.title}</span>
                          {itemIsExpanded ? (
                            <ChevronDown size={14} className="ml-auto text-muted-foreground" />
                          ) : (
                            <ChevronRight size={14} className="ml-auto text-muted-foreground" />
                          )}
                        </SidebarMenuButton>
                        {itemIsExpanded && (
                          <div className="ml-4 mt-1 space-y-1">
                            {item.subItems?.map((subItem) => {
                              const isSubActive = location === subItem.url;
                              return (
                                <SidebarMenuButton
                                  key={subItem.title}
                                  asChild
                                  className={cn(
                                    "w-full transition-all duration-200 text-sm",
                                    isSubActive && "bg-white/10 text-white"
                                  )}
                                  data-testid={`nav-${subItem.title.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  <Link href={subItem.url}>
                                    <subItem.icon size={16} className={isSubActive ? "text-cyan-400" : ""} />
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuButton>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
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
                    )}
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
