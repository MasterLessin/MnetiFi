import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Search,
  FileCheck,
  FileX,
  FileQuestion,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Filter,
  Calendar,
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Transaction, Plan } from "@shared/schema";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const reconciliationStatusLabels = {
  MATCHED: "Matched",
  UNMATCHED: "Unmatched",
  MANUAL_REVIEW: "Manual Review",
  PENDING: "Pending",
};

const reconciliationStatusColors = {
  MATCHED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  UNMATCHED: "bg-red-500/20 text-red-400 border-red-500/30",
  MANUAL_REVIEW: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  PENDING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const transactionStatusColors = {
  COMPLETED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  PENDING: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ReconciliationPage() {
  const [filterReconciliationStatus, setFilterReconciliationStatus] = useState<string>("all");
  const [filterTransactionStatus, setFilterTransactionStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("7d");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const plansMap = new Map(plans?.map((p) => [p.id, p]) || []);

  const getDateRange = () => {
    const now = new Date();
    switch (filterPeriod) {
      case "1d":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "7d":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "30d":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "90d":
        return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
      default:
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    }
  };

  const dateRange = getDateRange();

  const filteredTransactions = transactions?.filter((tx) => {
    const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date();
    const inDateRange = txDate >= dateRange.start && txDate <= dateRange.end;
    
    const matchesSearch = 
      tx.userPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.mpesaReceiptNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.checkoutRequestId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesReconciliation = 
      filterReconciliationStatus === "all" || 
      tx.reconciliationStatus === filterReconciliationStatus;
    
    const matchesStatus = 
      filterTransactionStatus === "all" || 
      tx.status === filterTransactionStatus;
    
    return inDateRange && matchesSearch && matchesReconciliation && matchesStatus;
  });

  const stats = {
    total: filteredTransactions?.length || 0,
    matched: filteredTransactions?.filter(t => t.reconciliationStatus === "MATCHED").length || 0,
    unmatched: filteredTransactions?.filter(t => t.reconciliationStatus === "UNMATCHED").length || 0,
    manualReview: filteredTransactions?.filter(t => t.reconciliationStatus === "MANUAL_REVIEW").length || 0,
    pending: filteredTransactions?.filter(t => t.reconciliationStatus === "PENDING").length || 0,
    totalAmount: filteredTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0,
    matchedAmount: filteredTransactions?.filter(t => t.reconciliationStatus === "MATCHED").reduce((sum, t) => sum + t.amount, 0) || 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6" data-testid="reconciliation-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reconciliation Reports</h1>
          <p className="text-muted-foreground">
            M-Pesa transaction matching and financial reports
          </p>
        </div>
        <Button variant="outline" data-testid="button-export-report">
          <Download size={18} className="mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <FileCheck size={18} className="text-emerald-400" />
            </div>
            <span className="text-sm text-muted-foreground">Matched</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.matched}</p>
          <p className="text-sm text-emerald-400">{formatCurrency(stats.matchedAmount)}</p>
        </motion.div>

        <motion.div
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/20">
              <FileX size={18} className="text-red-400" />
            </div>
            <span className="text-sm text-muted-foreground">Unmatched</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.unmatched}</p>
          <p className="text-xs text-muted-foreground">Require attention</p>
        </motion.div>

        <motion.div
          className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <FileQuestion size={18} className="text-amber-400" />
            </div>
            <span className="text-sm text-muted-foreground">Manual Review</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.manualReview}</p>
          <p className="text-xs text-muted-foreground">Needs review</p>
        </motion.div>

        <motion.div
          className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Clock size={18} className="text-blue-400" />
            </div>
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Awaiting response</p>
        </motion.div>
      </div>

      <GlassPanel size="sm" className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search by phone, receipt number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            data-testid="input-search-transactions"
          />
        </div>
        
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[130px] bg-white/5 border-white/10" data-testid="select-period">
            <Calendar size={14} className="mr-2" />
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Today</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterReconciliationStatus} onValueChange={setFilterReconciliationStatus}>
          <SelectTrigger className="w-[150px] bg-white/5 border-white/10" data-testid="select-reconciliation-status">
            <SelectValue placeholder="Reconciliation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="MATCHED">Matched</SelectItem>
            <SelectItem value="UNMATCHED">Unmatched</SelectItem>
            <SelectItem value="MANUAL_REVIEW">Manual Review</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterTransactionStatus} onValueChange={setFilterTransactionStatus}>
          <SelectTrigger className="w-[140px] bg-white/5 border-white/10" data-testid="select-transaction-status">
            <SelectValue placeholder="Tx Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </GlassPanel>

      <GlassPanel>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Transaction Log</h2>
          <p className="text-sm text-muted-foreground">
            Showing {filteredTransactions?.length || 0} transactions
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-white/5">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-1/4" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTransactions && filteredTransactions.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-white/10">
              <div className="col-span-2">Phone</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Receipt</div>
              <div className="col-span-2">Plan</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Reconciliation</div>
            </div>

            {filteredTransactions.map((tx, index) => {
              const plan = tx.planId ? plansMap.get(tx.planId) : null;
              const StatusIcon = tx.status === "COMPLETED" ? CheckCircle : tx.status === "FAILED" ? XCircle : Clock;
              
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/10"
                  data-testid={`transaction-row-${tx.id}`}
                >
                  <div className="col-span-2">
                    <p className="font-medium text-white text-sm">{tx.userPhone}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.createdAt ? format(new Date(tx.createdAt), "MMM d, HH:mm") : "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-semibold text-white">{formatCurrency(tx.amount)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-white truncate">
                      {tx.mpesaReceiptNumber || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tx.checkoutRequestId?.slice(0, 15) || "-"}...
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-white truncate">
                      {plan?.name || "-"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs flex items-center gap-1 w-fit", transactionStatusColors[tx.status as keyof typeof transactionStatusColors])}
                    >
                      <StatusIcon size={12} />
                      {tx.status}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", reconciliationStatusColors[tx.reconciliationStatus as keyof typeof reconciliationStatusColors])}
                    >
                      {reconciliationStatusLabels[tx.reconciliationStatus as keyof typeof reconciliationStatusLabels] || tx.reconciliationStatus}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Filter size={48} className="mx-auto mb-4 opacity-50" />
            <p>No transactions found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
