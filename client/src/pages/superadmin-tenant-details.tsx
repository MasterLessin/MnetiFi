import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Building2,
  ArrowLeft,
  Users,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  Pause,
  Ban,
  Power,
  RefreshCw,
  Wifi,
  Router,
  CreditCard,
  Activity,
  TrendingUp,
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { MetricCard, MetricCardSkeleton } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TenantDetails {
  id: string;
  name: string;
  subdomain: string;
  email: string | null;
  phone: string | null;
  tier: string;
  isActive: boolean;
  saasBillingStatus: string;
  trialExpiresAt: string | null;
  subscriptionExpiresAt: string | null;
  monthlyRevenue: number;
  totalUsers: number;
  createdAt: string;
  userCount: number;
  transactionCount: number;
  hotspotCount: number;
  planCount: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
}

export default function SuperAdminTenantDetailsPage() {
  const [, params] = useRoute("/superadmin/tenants/:id");
  const tenantId = params?.id;
  const { toast } = useToast();

  const { data: tenant, isLoading } = useQuery<TenantDetails>({
    queryKey: ["/api/superadmin/tenants", tenantId],
    enabled: !!tenantId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ isActive, saasBillingStatus }: { isActive?: boolean; saasBillingStatus?: string }) => {
      return apiRequest("PATCH", `/api/superadmin/tenants/${tenantId}/status`, {
        isActive,
        saasBillingStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      toast({ title: "Tenant Updated", description: "Status has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async (tier: string) => {
      return apiRequest("PATCH", `/api/superadmin/tenants/${tenantId}/subscription`, { tier });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      toast({ title: "Tier Updated", description: "Subscription tier has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: "bg-cyan-500/20", text: "text-cyan-400", label: "Active" },
      TRIAL: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Trial" },
      SUSPENDED: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Suspended" },
      BLOCKED: { bg: "bg-red-500/20", text: "text-red-400", label: "Blocked" },
    };
    const c = config[status] || config.TRIAL;
    return <Badge variant="outline" className={`${c.bg} ${c.text} border-0`}>{c.label}</Badge>;
  };

  const getTierBadge = (tier: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      TRIAL: { bg: "bg-purple-500/20", text: "text-purple-400" },
      TIER_1: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
      TIER_2: { bg: "bg-pink-500/20", text: "text-pink-400" },
    };
    const c = config[tier] || config.TRIAL;
    return <Badge variant="outline" className={`${c.bg} ${c.text} border-0`}>{tier.replace("_", " ")}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse h-8 w-64 bg-white/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Building2 size={48} className="mx-auto mb-4 opacity-50 text-muted-foreground" />
          <p className="text-muted-foreground">Tenant not found</p>
          <Link href="/superadmin/tenants">
            <Button variant="outline" className="mt-4">Back to Tenants</Button>
          </Link>
        </div>
      </div>
    );
  }

  const revenueGrowth = tenant.revenueLastMonth > 0
    ? Math.round(((tenant.revenueThisMonth - tenant.revenueLastMonth) / tenant.revenueLastMonth) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6" data-testid="tenant-details-page">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/superadmin/tenants">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
            {getTierBadge(tenant.tier)}
            {getStatusBadge(tenant.saasBillingStatus)}
          </div>
          <p className="text-muted-foreground">{tenant.subdomain}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="WiFi Users"
          value={tenant.userCount}
          icon={<Users size={24} />}
          gradient="primary"
        />
        <MetricCard
          title="This Month Revenue"
          value={formatCurrency(tenant.revenueThisMonth)}
          icon={<DollarSign size={24} />}
          trend={revenueGrowth !== 0 ? { value: revenueGrowth, label: "vs last month" } : undefined}
          gradient="mpesa"
        />
        <MetricCard
          title="Transactions"
          value={tenant.transactionCount}
          icon={<CreditCard size={24} />}
        />
        <MetricCard
          title="Hotspots"
          value={tenant.hotspotCount}
          icon={<Router size={24} />}
          gradient="accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassPanel size="md">
          <h2 className="text-lg font-semibold text-white mb-4">Tenant Information</h2>
          <div className="space-y-4">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="text-white">{tenant.email || "Not set"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Phone</span>
              <span className="text-white">{tenant.phone || "Not set"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Created</span>
              <span className="text-white">{format(new Date(tenant.createdAt), "PPP")}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Active Plans</span>
              <span className="text-white">{tenant.planCount}</span>
            </div>
            {tenant.trialExpiresAt && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Trial Expires</span>
                <span className="text-amber-400">{format(new Date(tenant.trialExpiresAt), "PPP")}</span>
              </div>
            )}
            {tenant.subscriptionExpiresAt && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subscription Expires</span>
                <span className="text-white">{format(new Date(tenant.subscriptionExpiresAt), "PPP")}</span>
              </div>
            )}
          </div>
        </GlassPanel>

        <GlassPanel size="md">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Change Tier</label>
              <Select
                value={tenant.tier}
                onValueChange={(tier) => updateTierMutation.mutate(tier)}
              >
                <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAL">Trial (Free)</SelectItem>
                  <SelectItem value="TIER_1">Tier 1 (Ksh 500/month)</SelectItem>
                  <SelectItem value="TIER_2">Tier 2 (Ksh 1,500/month)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              {tenant.saasBillingStatus !== "ACTIVE" && (
                <Button
                  onClick={() => updateStatusMutation.mutate({ isActive: true, saasBillingStatus: "ACTIVE" })}
                  className="flex-1"
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-activate"
                >
                  <CheckCircle size={16} className="mr-2" />
                  Activate
                </Button>
              )}
              {tenant.saasBillingStatus !== "SUSPENDED" && (
                <Button
                  variant="outline"
                  onClick={() => updateStatusMutation.mutate({ isActive: false, saasBillingStatus: "SUSPENDED" })}
                  className="flex-1"
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-suspend"
                >
                  <Pause size={16} className="mr-2" />
                  Suspend
                </Button>
              )}
              {tenant.saasBillingStatus !== "BLOCKED" && (
                <Button
                  variant="destructive"
                  onClick={() => updateStatusMutation.mutate({ isActive: false, saasBillingStatus: "BLOCKED" })}
                  className="flex-1"
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-block"
                >
                  <Ban size={16} className="mr-2" />
                  Block
                </Button>
              )}
            </div>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel size="md">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-white">Revenue Overview</h2>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-400" />
            <span className="text-sm text-muted-foreground">Monthly Performance</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            className="p-4 rounded-lg bg-white/5 border border-white/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-muted-foreground mb-1">This Month</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(tenant.revenueThisMonth)}</p>
          </motion.div>
          <motion.div
            className="p-4 rounded-lg bg-white/5 border border-white/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-sm text-muted-foreground mb-1">Last Month</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(tenant.revenueLastMonth)}</p>
          </motion.div>
          <motion.div
            className="p-4 rounded-lg bg-white/5 border border-white/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm text-muted-foreground mb-1">Growth</p>
            <p className={`text-2xl font-bold ${revenueGrowth >= 0 ? "text-cyan-400" : "text-red-400"}`}>
              {revenueGrowth >= 0 ? "+" : ""}{revenueGrowth}%
            </p>
          </motion.div>
        </div>
      </GlassPanel>
    </div>
  );
}
