import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Building2,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Ban,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Calendar,
  Eye,
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface TenantWithStats {
  id: string;
  name: string;
  subdomain: string;
  subscriptionTier: string;
  isActive: boolean;
  saasBillingStatus: string;
  trialExpiresAt: string | null;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  userCount: number;
  transactionCount: number;
  revenueThisMonth: number;
}

export default function SuperAdminTenantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: tenants, isLoading } = useQuery<TenantWithStats[]>({
    queryKey: ["/api/superadmin/tenants"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, isActive, saasBillingStatus }: { 
      id: string; 
      isActive?: boolean; 
      saasBillingStatus?: string 
    }) => {
      return apiRequest("PATCH", `/api/superadmin/tenants/${id}/status`, {
        isActive,
        saasBillingStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/analytics"] });
      toast({
        title: "Tenant Updated",
        description: "The tenant status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update tenant status",
        variant: "destructive",
      });
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: string }) => {
      return apiRequest("PATCH", `/api/superadmin/tenants/${id}/subscription`, {
        tier,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      toast({
        title: "Tier Updated",
        description: "The tenant tier has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update tenant tier",
        variant: "destructive",
      });
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

  const getTierBadge = (tier: string | undefined | null) => {
    const safeTier = tier || "TRIAL";
    const tierConfig: Record<string, { bg: string; text: string }> = {
      TRIAL: { bg: "bg-purple-500/20", text: "text-purple-400" },
      TIER_1: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
      TIER_2: { bg: "bg-pink-500/20", text: "text-pink-400" },
    };
    const config = tierConfig[safeTier] || tierConfig.TRIAL;
    return (
      <Badge variant="outline" className={`${config.bg} ${config.text} border-0`}>
        {safeTier.replace("_", " ")}
      </Badge>
    );
  };

  const filteredTenants = tenants?.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || tenant.saasBillingStatus === statusFilter;
    const matchesTier = tierFilter === "all" || tenant.subscriptionTier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  const handleActivate = (tenant: TenantWithStats) => {
    updateStatusMutation.mutate({
      id: tenant.id,
      isActive: true,
      saasBillingStatus: "ACTIVE",
    });
  };

  const handleSuspend = (tenant: TenantWithStats) => {
    updateStatusMutation.mutate({
      id: tenant.id,
      isActive: false,
      saasBillingStatus: "SUSPENDED",
    });
  };

  const handleBlock = (tenant: TenantWithStats) => {
    updateStatusMutation.mutate({
      id: tenant.id,
      isActive: false,
      saasBillingStatus: "BLOCKED",
    });
  };

  const handleChangeTier = (tenantId: string, tier: string) => {
    updateTierMutation.mutate({ id: tenantId, tier });
  };

  return (
    <div className="p-6 space-y-6" data-testid="superadmin-tenants-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage all tenants, their subscriptions, and access.
          </p>
        </div>
      </div>

      <GlassPanel size="sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
              data-testid="input-search-tenants"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-white/5 border-white/10" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[150px] bg-white/5 border-white/10" data-testid="select-tier-filter">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="TIER_1">Tier 1</SelectItem>
              <SelectItem value="TIER_2">Tier 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassPanel>

      <GlassPanel size="md">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-white/5">
                <div className="w-12 h-12 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-1/4" />
                  <div className="h-3 bg-white/10 rounded w-1/6" />
                </div>
                <div className="h-6 w-16 bg-white/10 rounded" />
                <div className="h-6 w-16 bg-white/10 rounded" />
                <div className="h-8 w-8 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : filteredTenants && filteredTenants.length > 0 ? (
          <div className="space-y-3">
            {filteredTenants.map((tenant, index) => (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-lg border bg-white/5 border-white/10"
                data-testid={`tenant-card-${tenant.id}`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-cyan-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white">{tenant.name}</p>
                    {getTierBadge(tenant.subscriptionTier)}
                    {getStatusBadge(tenant.saasBillingStatus)}
                  </div>
                  <p className="text-sm text-muted-foreground">{tenant.subdomain}</p>
                </div>

                <div className="hidden md:flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users size={14} />
                      <span className="text-xs">Users</span>
                    </div>
                    <p className="font-semibold text-white">{tenant.userCount}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign size={14} />
                      <span className="text-xs">Revenue</span>
                    </div>
                    <p className="font-semibold text-white">{formatCurrency(tenant.revenueThisMonth)}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar size={14} />
                      <span className="text-xs">Created</span>
                    </div>
                    <p className="text-sm text-white">
                      {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-tenant-actions-${tenant.id}`}>
                      <MoreVertical size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => setLocation(`/superadmin/tenants/${tenant.id}`)}
                      data-testid={`action-view-${tenant.id}`}
                    >
                      <Eye size={16} className="mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {tenant.saasBillingStatus !== "ACTIVE" && (
                      <DropdownMenuItem 
                        onClick={() => handleActivate(tenant)}
                        data-testid={`action-activate-${tenant.id}`}
                      >
                        <CheckCircle size={16} className="mr-2 text-cyan-400" />
                        Activate
                      </DropdownMenuItem>
                    )}
                    {tenant.saasBillingStatus !== "SUSPENDED" && (
                      <DropdownMenuItem 
                        onClick={() => handleSuspend(tenant)}
                        data-testid={`action-suspend-${tenant.id}`}
                      >
                        <Pause size={16} className="mr-2 text-amber-400" />
                        Suspend
                      </DropdownMenuItem>
                    )}
                    {tenant.saasBillingStatus !== "BLOCKED" && (
                      <DropdownMenuItem 
                        onClick={() => handleBlock(tenant)}
                        data-testid={`action-block-${tenant.id}`}
                      >
                        <Ban size={16} className="mr-2 text-red-400" />
                        Block
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleChangeTier(tenant.id, "TRIAL")}
                      disabled={tenant.subscriptionTier === "TRIAL"}
                      data-testid={`action-tier-trial-${tenant.id}`}
                    >
                      Set to Trial
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleChangeTier(tenant.id, "TIER_1")}
                      disabled={tenant.subscriptionTier === "TIER_1"}
                      data-testid={`action-tier-1-${tenant.id}`}
                    >
                      Set to Tier 1
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleChangeTier(tenant.id, "TIER_2")}
                      disabled={tenant.subscriptionTier === "TIER_2"}
                      data-testid={`action-tier-2-${tenant.id}`}
                    >
                      Set to Tier 2
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 size={48} className="mx-auto mb-4 opacity-50" />
            <p>No tenants found</p>
            {(searchQuery || statusFilter !== "all" || tierFilter !== "all") && (
              <p className="text-sm mt-1">Try adjusting your filters</p>
            )}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
