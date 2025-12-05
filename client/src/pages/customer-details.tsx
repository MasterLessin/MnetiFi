import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  Mail,
  User,
  Wifi,
  Router,
  Clock,
  Calendar,
  CreditCard,
  Receipt,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Ban,
  Play,
  Edit,
  Loader2,
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { MetricCard, MetricCardSkeleton } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface CustomerDetails {
  id: string;
  phoneNumber: string;
  email: string | null;
  fullName: string | null;
  accountType: string;
  status: string;
  macAddress: string | null;
  ipAddress: string | null;
  username: string | null;
  expiryTime: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  currentPlan: {
    id: string;
    name: string;
    price: number;
    durationSeconds: number;
    uploadLimit: string | null;
    downloadLimit: string | null;
  } | null;
  currentHotspot: {
    id: string;
    locationName: string;
    nasIp: string;
  } | null;
  transactions: {
    id: string;
    amount: number;
    status: string;
    mpesaReceiptNumber: string | null;
    createdAt: string;
    planName: string | null;
  }[];
  stats: {
    totalSpent: number;
    totalTransactions: number;
    successfulPayments: number;
    failedPayments: number;
    daysSinceRegistration: number;
    averagePayment: number;
  };
}

const accountTypeLabels: Record<string, string> = {
  HOTSPOT: "Hotspot",
  PPPOE: "PPPoE",
  STATIC: "Static IP",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  SUSPENDED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  EXPIRED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const transactionStatusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  COMPLETED: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/20" },
  PENDING: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/20" },
  FAILED: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20" },
};

export default function CustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: customer, isLoading, error } = useQuery<CustomerDetails>({
    queryKey: ["/api/wifi-users", params.id, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/wifi-users/${params.id}/details`);
      if (!response.ok) {
        throw new Error("Failed to fetch customer details");
      }
      return response.json();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action }: { action: string }) => {
      return apiRequest("POST", `/api/wifi-users/${params.id}/${action}`, {});
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wifi-users", params.id, "details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wifi-users"] });
      const actionLabels: Record<string, string> = {
        suspend: "Customer suspended",
        activate: "Customer activated",
        recharge: "Account recharged",
      };
      toast({
        title: "Success",
        description: actionLabels[variables.action] || "Action completed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to perform action",
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

  const formatDuration = (seconds: number) => {
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)} minutes`;
    } else if (seconds < 86400) {
      return `${Math.round(seconds / 3600)} hours`;
    } else if (seconds < 604800) {
      return `${Math.round(seconds / 86400)} days`;
    } else {
      return `${Math.round(seconds / 604800)} weeks`;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="customer-details-loading">
        <div className="flex items-center gap-4">
          <div className="h-10 w-24 bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-64 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6" data-testid="customer-details-error">
        <GlassPanel className="text-center py-12">
          <XCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">Customer Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The customer you're looking for doesn't exist or has been deleted.
          </p>
          <Link href="/dashboard/wifi-users">
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-2" />
              Back to Customers
            </Button>
          </Link>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="customer-details-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/wifi-users">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white" data-testid="text-customer-name">
                {customer.fullName || customer.phoneNumber}
              </h1>
              <Badge
                variant="outline"
                className={cn("text-sm", statusColors[customer.status])}
                data-testid="badge-customer-status"
              >
                {customer.status}
              </Badge>
              <Badge
                variant="outline"
                className="text-sm bg-blue-500/20 text-blue-400 border-blue-500/30"
              >
                {accountTypeLabels[customer.accountType]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Customer since {format(new Date(customer.createdAt), "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {customer.status === "ACTIVE" ? (
            <Button
              variant="outline"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
              onClick={() => actionMutation.mutate({ action: "suspend" })}
              disabled={actionMutation.isPending}
              data-testid="button-suspend"
            >
              {actionMutation.isPending ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Ban size={16} className="mr-2" />
              )}
              Suspend
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              onClick={() => actionMutation.mutate({ action: "activate" })}
              disabled={actionMutation.isPending}
              data-testid="button-activate"
            >
              {actionMutation.isPending ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Play size={16} className="mr-2" />
              )}
              Activate
            </Button>
          )}
          <Button
            className="gradient-btn"
            onClick={() => actionMutation.mutate({ action: "recharge" })}
            disabled={actionMutation.isPending}
            data-testid="button-recharge"
          >
            <RefreshCw size={16} className="mr-2" />
            Quick Recharge
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Spent"
          value={formatCurrency(customer.stats.totalSpent)}
          icon={<CreditCard size={24} />}
          gradient="mpesa"
        />
        <MetricCard
          title="Total Payments"
          value={customer.stats.totalTransactions}
          icon={<Receipt size={24} />}
          trend={{
            value: customer.stats.successfulPayments,
            label: "successful",
          }}
        />
        <MetricCard
          title="Avg. Payment"
          value={formatCurrency(customer.stats.averagePayment)}
          icon={<CreditCard size={24} />}
        />
        <MetricCard
          title="Days Active"
          value={customer.stats.daysSinceRegistration}
          icon={<Calendar size={24} />}
          gradient="accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <GlassPanel size="md">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User size={20} className="text-cyan-400" />
              Customer Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5">
                  <Phone size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="text-white font-medium" data-testid="text-phone">
                    {customer.phoneNumber}
                  </p>
                </div>
              </div>

              {customer.email && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    <Mail size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-white font-medium" data-testid="text-email">
                      {customer.email}
                    </p>
                  </div>
                </div>
              )}

              {customer.username && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    <User size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="text-white font-medium">{customer.username}</p>
                  </div>
                </div>
              )}

              {customer.macAddress && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    <Wifi size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">MAC Address</p>
                    <p className="text-white font-medium font-mono text-sm">
                      {customer.macAddress}
                    </p>
                  </div>
                </div>
              )}

              {customer.ipAddress && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    <Router size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IP Address</p>
                    <p className="text-white font-medium font-mono text-sm">
                      {customer.ipAddress}
                    </p>
                  </div>
                </div>
              )}

              {customer.notes && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-white text-sm">{customer.notes}</p>
                </div>
              )}
            </div>
          </GlassPanel>

          <GlassPanel size="md">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Wifi size={20} className="text-cyan-400" />
              Current Plan
            </h2>
            {customer.currentPlan ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                  <h3 className="text-lg font-semibold text-white">
                    {customer.currentPlan.name}
                  </h3>
                  <p className="text-2xl font-bold text-cyan-400 mt-1">
                    {formatCurrency(customer.currentPlan.price)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDuration(customer.currentPlan.durationSeconds)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-xs text-muted-foreground">Upload</p>
                    <p className="text-white font-medium">
                      {customer.currentPlan.uploadLimit || "Unlimited"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-xs text-muted-foreground">Download</p>
                    <p className="text-white font-medium">
                      {customer.currentPlan.downloadLimit || "Unlimited"}
                    </p>
                  </div>
                </div>

                {customer.expiryTime && (
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-xs text-muted-foreground">Expires</p>
                    <p
                      className={cn(
                        "font-medium",
                        new Date(customer.expiryTime) < new Date()
                          ? "text-red-400"
                          : "text-white"
                      )}
                    >
                      {format(new Date(customer.expiryTime), "MMM d, yyyy HH:mm")}
                      <span className="text-muted-foreground text-sm ml-2">
                        ({formatDistanceToNow(new Date(customer.expiryTime), { addSuffix: true })})
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Wifi size={32} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active plan</p>
              </div>
            )}
          </GlassPanel>

          {customer.currentHotspot && (
            <GlassPanel size="md">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Router size={20} className="text-cyan-400" />
                Connected Hotspot
              </h2>
              <div className="p-4 rounded-lg bg-white/5">
                <h3 className="font-semibold text-white">
                  {customer.currentHotspot.locationName}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  {customer.currentHotspot.nasIp}
                </p>
              </div>
            </GlassPanel>
          )}
        </div>

        <div className="lg:col-span-2">
          <GlassPanel size="md">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Receipt size={20} className="text-cyan-400" />
              Payment History
            </h2>

            {customer.transactions.length > 0 ? (
              <div className="space-y-3">
                {customer.transactions.map((tx, index) => {
                  const config = transactionStatusConfig[tx.status] || transactionStatusConfig.PENDING;
                  const StatusIcon = config.icon;

                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-white/5 border-white/10"
                      data-testid={`transaction-row-${tx.id}`}
                    >
                      <div className={cn("p-2 rounded-full", config.bg)}>
                        <StatusIcon size={18} className={config.color} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white">
                            {formatCurrency(tx.amount)}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", config.bg, config.color, "border-0")}
                          >
                            {tx.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          {tx.planName && <span>{tx.planName}</span>}
                          {tx.mpesaReceiptNumber && (
                            <span className="font-mono text-xs">
                              {tx.mpesaReceiptNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-white">
                          {format(new Date(tx.createdAt), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.createdAt), "HH:mm")}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No payment history yet</p>
              </div>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
