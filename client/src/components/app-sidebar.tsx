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
  Star,
  Crown,
  Lock,
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TierFeatures } from "@shared/schema";

interface AppSidebarProps {
  onLogout?: () => void;
  subscriptionTier?: string;
}

interface MenuItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  featureKey?: string;
  subItems?: { title: string; url: string; icon: typeof LayoutDashboard; featureKey?: string }[];
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    featureKey: "dashboard",
  },
  {
    title: "WiFi Users",
    url: "/dashboard/wifi-users",
    icon: Users,
    featureKey: "wifi-users",
  },
  {
    title: "Plans",
    url: "/dashboard/plans",
    icon: CreditCard,
    featureKey: "hotspot-plans",
    subItems: [
      { title: "Hotspot Plans", url: "/dashboard/hotspot-plans", icon: Wifi, featureKey: "hotspot-plans" },
      { title: "PPPoE Plans", url: "/dashboard/pppoe-plans", icon: Router, featureKey: "pppoe-plans" },
      { title: "Static IP Plans", url: "/dashboard/static-plans", icon: Globe, featureKey: "static-plans" },
    ],
  },
  {
    title: "Hotspots",
    url: "/dashboard/hotspots",
    icon: Wifi,
    featureKey: "hotspots",
  },
  {
    title: "Transactions",
    url: "/dashboard/transactions",
    icon: Receipt,
    featureKey: "transactions",
  },
  {
    title: "SMS Campaigns",
    url: "/dashboard/sms-campaigns",
    icon: MessageSquare,
    featureKey: "sms-campaigns",
  },
  {
    title: "Network Monitoring",
    url: "/dashboard/network-monitoring",
    icon: Activity,
    featureKey: "network-monitoring",
  },
  {
    title: "Vouchers",
    url: "/dashboard/vouchers",
    icon: Key,
    featureKey: "vouchers",
  },
  {
    title: "Tickets",
    url: "/dashboard/tickets",
    icon: Ticket,
    featureKey: "tickets",
  },
  {
    title: "Reconciliation",
    url: "/dashboard/reconciliation",
    icon: FileCheck,
    featureKey: "reconciliation",
  },
  {
    title: "Reports",
    url: "/dashboard/reports",
    icon: BarChart3,
    featureKey: "reports",
  },
  {
    title: "Walled Garden",
    url: "/dashboard/walled-garden",
    icon: Globe,
    featureKey: "walled-garden",
  },
  {
    title: "Zones",
    url: "/dashboard/zones",
    icon: MapPin,
    featureKey: "zones",
  },
  {
    title: "Chat",
    url: "/dashboard/chat",
    icon: MessageSquare,
    featureKey: "chat",
  },
  {
    title: "Loyalty Points",
    url: "/dashboard/loyalty",
    icon: Star,
    featureKey: "loyalty",
  },
];

const settingsItems = [
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
    featureKey: "settings",
  },
];

export function AppSidebar({ onLogout, subscriptionTier = "BASIC" }: AppSidebarProps) {
  const [location] = useLocation();
  
  const tier = subscriptionTier as keyof typeof TierFeatures;
  const allowedFeatures = TierFeatures[tier] || TierFeatures.BASIC;
  
  const hasFeatureAccess = (featureKey?: string) => {
    if (!featureKey) return true;
    return allowedFeatures.includes(featureKey as any);
  };

  const filterMenuItems = (items: MenuItem[]) => {
    return items.map(item => {
      if (item.subItems) {
        const filteredSubItems = item.subItems.filter(sub => hasFeatureAccess(sub.featureKey));
        if (filteredSubItems.length === 0) return null;
        
        const hasAnyPremiumSub = item.subItems.some(sub => !hasFeatureAccess(sub.featureKey));
        return {
          ...item,
          subItems: item.subItems.map(sub => ({
            ...sub,
            isLocked: !hasFeatureAccess(sub.featureKey),
          })),
        };
      }
      return {
        ...item,
        isLocked: !hasFeatureAccess(item.featureKey),
      };
    }).filter((item): item is NonNullable<typeof item> => {
      if (!item) return false;
      if (item.subItems) {
        return item.subItems.some(sub => !(sub as any).isLocked);
      }
      return !(item as any).isLocked;
    });
  };

  const filteredMenuItems = filterMenuItems(menuItems);
  
  const getAutoExpandedItems = () => {
    return filteredMenuItems
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

  const isBasicTier = subscriptionTier === "BASIC";

  return (
    <Sidebar className="border-r border-white/10 bg-sidebar/50 backdrop-blur-xl">
      <SidebarHeader className="p-4 border-b border-white/10">
        <Link href="/dashboard">
          <MnetiFiLogo size="md" />
        </Link>
        {isBasicTier && (
          <Badge className="mt-2 bg-cyan-500/20 text-cyan-400 border-0">
            Free Trial
          </Badge>
        )}
        {!isBasicTier && (
          <Badge className="mt-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-0">
            <Crown size={12} className="mr-1" />
            Premium
          </Badge>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-3 py-2">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
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
                              const isLocked = (subItem as any).isLocked;
                              
                              if (isLocked) {
                                return (
                                  <SidebarMenuButton
                                    key={subItem.title}
                                    className="w-full text-sm opacity-50 cursor-not-allowed"
                                    data-testid={`nav-${subItem.title.toLowerCase().replace(/\s+/g, "-")}-locked`}
                                  >
                                    <Lock size={14} className="text-muted-foreground" />
                                    <span>{subItem.title}</span>
                                    <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0 border-purple-500/50 text-purple-400">
                                      Premium
                                    </Badge>
                                  </SidebarMenuButton>
                                );
                              }
                              
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

        {isBasicTier && (
          <SidebarGroup>
            <div className="mx-2 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={16} className="text-purple-400" />
                <span className="text-sm font-medium text-white">Upgrade to Premium</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Unlock PPPoE, Static IP, Technicians, and more features.
              </p>
              <Link href="/dashboard/upgrade">
                <button className="w-full py-2 px-3 text-xs font-medium rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-colors">
                  Upgrade Now
                </button>
              </Link>
            </div>
          </SidebarGroup>
        )}
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
