import { Link, useLocation } from "wouter";
import { 
  Building2, 
  Wifi, 
  CreditCard, 
  Database, 
  Upload, 
  Trash2,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const settingsMenuItems = [
  {
    title: "Profile",
    href: "/dashboard/settings/profile",
    icon: Building2,
    description: "Organization & branding",
  },
  {
    title: "Hotspot Settings",
    href: "/dashboard/settings/hotspot-settings",
    icon: Wifi,
    description: "NAS & RADIUS configuration",
  },
  {
    title: "Payment Gateway",
    href: "/dashboard/settings/payment-gateway",
    icon: CreditCard,
    description: "M-Pesa integration",
  },
  {
    title: "Backup & Restore",
    href: "/dashboard/settings/backup-restore",
    icon: Database,
    description: "Database management",
  },
  {
    title: "MikroTik Import",
    href: "/dashboard/settings/mikrotik-import",
    icon: Upload,
    description: "Import users from router",
  },
  {
    title: "Clear Cache",
    href: "/dashboard/settings/clear-cache",
    icon: Trash2,
    description: "Clear application cache",
  },
];

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-full" data-testid="settings-layout">
      <aside className="w-64 border-r border-white/10 bg-background/30 backdrop-blur-sm flex-shrink-0">
        <div className="p-4 border-b border-white/10">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" data-testid="button-back-dashboard">
              <ChevronLeft size={16} />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <div className="p-4">
          <h2 className="text-lg font-semibold text-white mb-1">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your configuration</p>
        </div>
        <nav className="px-2 pb-4">
          {settingsMenuItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-colors cursor-pointer",
                    isActive
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}
                  data-testid={`settings-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon size={20} className={isActive ? "text-cyan-400" : ""} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", isActive && "text-cyan-400")}>
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
