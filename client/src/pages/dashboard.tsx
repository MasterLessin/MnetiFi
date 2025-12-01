import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  DollarSign,
  Users,
  Wifi,
  TrendingUp,
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Ticket,
  Phone,
  Calendar,
} from "lucide-react";
import { MetricCard, MetricCardSkeleton } from "@/components/metric-card";
import { TransactionList, TransactionListSkeleton } from "@/components/transaction-list";
import { GlassPanel } from "@/components/glass-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Transaction, Plan, WifiUser } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

interface DashboardStats {
  totalRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  activeHotspots: number;
  activeWifiUsers: number;
  openTickets: number;
  expiringUsers: WifiUser[];
  recentTransactions: Transaction[];
}

export default function Dashboard() {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Fetch plans for transaction display
  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const plansMap = new Map(plans?.map((p) => [p.id, p]) || []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your hotspot network.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {statsLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(stats?.totalRevenue || 0)}
              icon={<DollarSign size={24} />}
              trend={{ value: 12, label: "vs last week" }}
              gradient="primary"
            />
            <MetricCard
              title="Active Users"
              value={stats?.activeWifiUsers || 0}
              icon={<Users size={24} />}
              gradient="accent"
            />
            <MetricCard
              title="Transactions"
              value={stats?.totalTransactions || 0}
              subtitle="total"
              icon={<Receipt size={24} />}
              trend={{ value: 8, label: "vs last week" }}
            />
            <MetricCard
              title="Success Rate"
              value={
                stats?.totalTransactions
                  ? `${Math.round((stats.successfulTransactions / stats.totalTransactions) * 100)}%`
                  : "0%"
              }
              icon={<TrendingUp size={24} />}
            />
            <MetricCard
              title="Active Hotspots"
              value={stats?.activeHotspots || 0}
              icon={<Wifi size={24} />}
            />
            <MetricCard
              title="Open Tickets"
              value={stats?.openTickets || 0}
              icon={<Ticket size={24} />}
            />
          </>
        )}
      </div>

      {/* Transaction Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          className="flex items-center gap-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-3 rounded-full bg-cyan-500/20">
            <CheckCircle size={24} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Successful</p>
            <p className="text-2xl font-bold text-white">
              {stats?.successfulTransactions || 0}
            </p>
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="p-3 rounded-full bg-purple-500/20">
            <Clock size={24} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-white">
              {stats?.pendingTransactions || 0}
            </p>
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-4 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="p-3 rounded-full bg-pink-500/20">
            <XCircle size={24} className="text-pink-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-white">
              {stats?.failedTransactions || 0}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <GlassPanel size="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
          <a
            href="/dashboard/transactions"
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            data-testid="link-view-all-transactions"
          >
            View All
          </a>
        </div>

        {statsLoading ? (
          <TransactionListSkeleton count={5} />
        ) : stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
          <TransactionList
            transactions={stats.recentTransactions}
            plans={plansMap}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt size={48} className="mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
