import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Filter, Download, Receipt, RefreshCw } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { TransactionList, TransactionListSkeleton } from "@/components/transaction-list";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Transaction, Plan, TransactionStatusType } from "@shared/schema";

type FilterStatus = TransactionStatusType | "ALL";

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");

  // Fetch transactions
  const { data: transactions, isLoading, isFetching } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch plans for display
  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const plansMap = new Map(plans?.map((p) => [p.id, p]) || []);

  // Filter transactions
  const filteredTransactions = transactions?.filter((t) => {
    const matchesSearch =
      t.userPhone.includes(searchQuery) ||
      t.mpesaReceiptNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
  };

  const statusFilters: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "ALL" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Pending", value: "PENDING" },
    { label: "Failed", value: "FAILED" },
  ];

  // Calculate stats
  const stats = {
    total: transactions?.length || 0,
    completed: transactions?.filter((t) => t.status === "COMPLETED").length || 0,
    pending: transactions?.filter((t) => t.status === "PENDING").length || 0,
    failed: transactions?.filter((t) => t.status === "FAILED").length || 0,
  };

  return (
    <div className="p-6 space-y-6" data-testid="transactions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-muted-foreground">
            View and manage payment transactions
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={isFetching}
            data-testid="button-refresh"
          >
            <RefreshCw size={18} className={cn("mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="ghost" data-testid="button-export">
            <Download size={18} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          className="p-4 rounded-xl bg-white/5 border border-white/10 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </motion.div>
        <motion.div
          className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-2xl font-bold text-cyan-400">{stats.completed}</p>
          <p className="text-sm text-muted-foreground">Completed</p>
        </motion.div>
        <motion.div
          className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-2xl font-bold text-purple-400">{stats.pending}</p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </motion.div>
        <motion.div
          className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-2xl font-bold text-pink-400">{stats.failed}</p>
          <p className="text-sm text-muted-foreground">Failed</p>
        </motion.div>
      </div>

      {/* Filters */}
      <GlassPanel size="sm" className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <GlassInput
            placeholder="Search by phone or receipt number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={16} />}
            data-testid="input-search"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <div className="flex gap-1">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  statusFilter === filter.value
                    ? "bg-white/10 text-white"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
                data-testid={`filter-${filter.value.toLowerCase()}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </GlassPanel>

      {/* Transactions List */}
      <GlassPanel size="md">
        {isLoading ? (
          <TransactionListSkeleton count={10} />
        ) : filteredTransactions && filteredTransactions.length > 0 ? (
          <TransactionList
            transactions={filteredTransactions}
            plans={plansMap}
            showDetails
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt size={48} className="mx-auto mb-4 opacity-50" />
            <p>
              {searchQuery || statusFilter !== "ALL"
                ? "No transactions match your filters"
                : "No transactions yet"}
            </p>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
