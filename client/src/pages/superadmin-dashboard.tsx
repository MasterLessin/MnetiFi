import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Play,
  Pause,
  AlertTriangle,
  Clock,
  CheckCircle,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { MetricCard, MetricCardSkeleton } from "@/components/metric-card";
import { GlassPanel } from "@/components/glass-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface PlatformAnalytics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  transactionsToday: number;
  newTenantsThisMonth: number;
}

interface TenantWithStats {
  id: string;
  name: string;
  subdomain: string;
  tier: string;
  isActive: boolean;
  saasBillingStatus: string;
  trialExpiresAt: string | null;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  userCount: number;
  transactionCount: number;
  revenueThisMonth: number;
}

export default function SuperAdminDashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery<PlatformAnalytics>({
    queryKey: ["/api/superadmin/analytics"],
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery<TenantWithStats[]>({
    queryKey: ["/api/superadmin/tenants"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRevenueGrowth = () => {
    if (!analytics?.revenueLastMonth) return 0;
    return Math.round(
      ((analytics.revenueThisMonth - analytics.revenueLastMonth) / analytics.revenueLastMonth) * 100
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: "bg-cyan-500/20", text: "text-cyan-400", label: "Active" },
      TRIAL: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Trial" },
      SUSPENDED: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Suspended" },
      BLOCKED: { bg: "bg-red-500/20", text: "text-red-400", label: "Blocked" },
      PENDING: { bg: "bg-slate-500/20", text: "text-slate-400", label: "Pending" },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Badge variant="outline" className={`${config.bg} ${config.text} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const getTierBadge = (tier: string) => {
    const tierConfig: Record<string, { bg: string; text: string }> = {
      TRIAL: { bg: "bg-purple-500/20", text: "text-purple-400" },
      TIER_1: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
      TIER_2: { bg: "bg-pink-500/20", text: "text-pink-400" },
    };
    const config = tierConfig[tier] || tierConfig.TRIAL;
    return (
      <Badge variant="outline" className={`${config.bg} ${config.text} border-0`}>
        {tier.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="superadmin-dashboard-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
          <p className="text-muted-foreground">
            Monitor and manage all tenants across the platform.
          </p>
        </div>
        <Link href="/superadmin/tenants">
          <Button data-testid="button-manage-tenants">
            Manage Tenants
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {analyticsLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Tenants"
              value={analytics?.totalTenants || 0}
              icon={<Building2 size={24} />}
              gradient="primary"
            />
            <MetricCard
              title="Platform Revenue"
              value={formatCurrency(analytics?.totalRevenue || 0)}
              icon={<DollarSign size={24} />}
              trend={getRevenueGrowth() !== 0 ? { value: getRevenueGrowth(), label: "vs last month" } : undefined}
              gradient="mpesa"
            />
            <MetricCard
              title="This Month"
              value={formatCurrency(analytics?.revenueThisMonth || 0)}
              icon={<TrendingUp size={24} />}
            />
            <MetricCard
              title="Total Users"
              value={analytics?.totalUsers || 0}
              icon={<Users size={24} />}
              gradient="accent"
            />
            <MetricCard
              title="Today's Transactions"
              value={analytics?.transactionsToday || 0}
              icon={<Calendar size={24} />}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          className="flex items-center gap-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="status-active-tenants"
        >
          <div className="p-3 rounded-full bg-cyan-500/20">
            <CheckCircle size={24} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-white">
              {analytics?.activeTenants || 0}
            </p>
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="status-trial-tenants"
        >
          <div className="p-3 rounded-full bg-purple-500/20">
            <Clock size={24} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">On Trial</p>
            <p className="text-2xl font-bold text-white">
              {analytics?.trialTenants || 0}
            </p>
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          data-testid="status-suspended-tenants"
        >
          <div className="p-3 rounded-full bg-amber-500/20">
            <Pause size={24} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Suspended</p>
            <p className="text-2xl font-bold text-white">
              {analytics?.suspendedTenants || 0}
            </p>
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          data-testid="status-new-tenants"
        >
          <div className="p-3 rounded-full bg-green-500/20">
            <Play size={24} className="text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">New This Month</p>
            <p className="text-2xl font-bold text-white">
              {analytics?.newTenantsThisMonth || 0}
            </p>
          </div>
        </motion.div>
      </div>

      <GlassPanel size="md">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-white">Recent Tenants</h2>
          <Link
            href="/superadmin/tenants"
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            data-testid="link-view-all-tenants"
          >
            View All
          </Link>
        </div>

        {tenantsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-white/5">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/10 rounded w-1/4" />
                </div>
                <div className="h-6 w-16 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : tenants && tenants.length > 0 ? (
          <div className="space-y-3">
            {tenants.slice(0, 5).map((tenant) => (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 p-4 rounded-lg border bg-white/5 border-white/10"
                data-testid={`tenant-row-${tenant.id}`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                  <Building2 size={18} className="text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">{tenant.subdomain}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {getTierBadge(tenant.tier)}
                  {getStatusBadge(tenant.saasBillingStatus)}
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">
                    {formatCurrency(tenant.revenueThisMonth)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tenant.userCount} users
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 size={48} className="mx-auto mb-4 opacity-50" />
            <p>No tenants found</p>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
