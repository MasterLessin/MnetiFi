import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Users,
  Router,
  Wifi,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Phone,
  Plus,
} from "lucide-react";
import { MetricCard, MetricCardSkeleton } from "@/components/metric-card";
import { GlassPanel } from "@/components/glass-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WifiUser } from "@shared/schema";
import { format } from "date-fns";

interface TechDashboardStats {
  totalPppoeUsers: number;
  totalStaticUsers: number;
  activeUsers: number;
  expiringUsers: WifiUser[];
}

export default function TechDashboard() {
  const { data: stats, isLoading } = useQuery<TechDashboardStats>({
    queryKey: ["/api/tech/stats"],
  });

  return (
    <div className="p-6 space-y-6" data-testid="tech-dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Technician Dashboard</h1>
          <p className="text-muted-foreground">
            Manage PPPoE and Static IP customers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tech/pppoe-users">
            <Button className="gradient-btn" data-testid="button-add-pppoe">
              <Plus size={18} className="mr-2" />
              Add PPPoE User
            </Button>
          </Link>
          <Link href="/tech/static-users">
            <Button variant="outline" className="border-white/20" data-testid="button-add-static">
              <Plus size={18} className="mr-2" />
              Add Static IP User
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="PPPoE Users"
              value={stats?.totalPppoeUsers || 0}
              icon={<Router size={24} />}
              gradient="primary"
            />
            <MetricCard
              title="Static IP Users"
              value={stats?.totalStaticUsers || 0}
              icon={<Wifi size={24} />}
              gradient="accent"
            />
            <MetricCard
              title="Active Users"
              value={stats?.activeUsers || 0}
              icon={<CheckCircle size={24} />}
            />
            <MetricCard
              title="Expiring Soon"
              value={stats?.expiringUsers?.length || 0}
              icon={<AlertTriangle size={24} />}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PPPoE Management Card */}
        <GlassPanel size="md" className="glass-panel-hover">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Router size={24} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">PPPoE Users</h2>
              <p className="text-sm text-muted-foreground">
                Manage broadband customers with monthly billing
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <span className="text-sm text-muted-foreground">Total Users</span>
              <span className="font-semibold text-white">{stats?.totalPppoeUsers || 0}</span>
            </div>
            <Link href="/tech/pppoe-users">
              <Button className="w-full" variant="outline" data-testid="button-manage-pppoe">
                Manage PPPoE Users
              </Button>
            </Link>
          </div>
        </GlassPanel>

        {/* Static IP Management Card */}
        <GlassPanel size="md" className="glass-panel-hover">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Wifi size={24} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Static IP Users</h2>
              <p className="text-sm text-muted-foreground">
                Manage dedicated IP customers
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <span className="text-sm text-muted-foreground">Total Users</span>
              <span className="font-semibold text-white">{stats?.totalStaticUsers || 0}</span>
            </div>
            <Link href="/tech/static-users">
              <Button className="w-full" variant="outline" data-testid="button-manage-static">
                Manage Static IP Users
              </Button>
            </Link>
          </div>
        </GlassPanel>
      </div>

      {/* Expiring Users */}
      <GlassPanel size="md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Expiring Soon</h2>
          </div>
          <Link href="/tech/customers">
            <Button variant="ghost" size="sm" data-testid="button-view-all-customers">
              View All
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : stats?.expiringUsers && stats.expiringUsers.length > 0 ? (
          <div className="space-y-3">
            {stats.expiringUsers.slice(0, 5).map((user) => {
              const expiryDate = user.expiryTime ? new Date(user.expiryTime) : null;
              const daysUntilExpiry = expiryDate
                ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 0;

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                  data-testid={`expiring-user-${user.id}`}
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Phone size={18} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {user.fullName || user.phoneNumber}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {user.accountType}
                      </Badge>
                      <span>{user.phoneNumber}</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      daysUntilExpiry <= 1
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {daysUntilExpiry <= 0 ? "Today" : `${daysUntilExpiry}d left`}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <p>No users expiring in the next 5 days</p>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
