import { motion, AnimatePresence } from "framer-motion";
import { Phone, Calendar, Receipt, MapPin } from "lucide-react";
import { StatusBadge, StatusDot } from "./status-badge";
import { cn } from "@/lib/utils";
import type { Transaction, Plan } from "@shared/schema";

interface TransactionItemProps {
  transaction: Transaction;
  plan?: Plan;
  showDetails?: boolean;
}

export function TransactionItem({ transaction, plan, showDetails = false }: TransactionItemProps) {
  const formatPhone = (phone: string) => {
    if (phone.startsWith("254")) {
      return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    }
    return phone;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("en-KE", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div
      className={cn(
        "rounded-xl bg-white/5 backdrop-blur-sm border border-white/10",
        "hover:bg-white/8 hover:border-white/15 transition-all duration-200",
        "p-4"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.01 }}
      data-testid={`transaction-item-${transaction.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Status indicator */}
          <div className="mt-1">
            <StatusDot status={transaction.status as "PENDING" | "COMPLETED" | "FAILED"} />
          </div>

          <div className="space-y-1">
            {/* Phone number */}
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-muted-foreground" />
              <span className="text-white font-medium">
                {formatPhone(transaction.userPhone)}
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={12} />
              <span>{formatDate(transaction.createdAt)}</span>
            </div>

            {showDetails && (
              <>
                {/* Receipt number */}
                {transaction.mpesaReceiptNumber && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Receipt size={12} />
                    <span className="font-mono text-xs">
                      {transaction.mpesaReceiptNumber}
                    </span>
                  </div>
                )}

                {/* NAS IP */}
                {transaction.nasIp && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin size={12} />
                    <span className="font-mono text-xs">{transaction.nasIp}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="text-right space-y-2">
          {/* Amount */}
          <span className="text-lg font-semibold gradient-text">
            {formatAmount(transaction.amount)}
          </span>

          {/* Status badge */}
          <div>
            <StatusBadge
              status={transaction.status as "PENDING" | "COMPLETED" | "FAILED"}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Plan info */}
      {plan && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <span className="text-sm text-muted-foreground">
            Plan: <span className="text-white">{plan.name}</span>
          </span>
        </div>
      )}
    </motion.div>
  );
}

// Transaction list component
interface TransactionListProps {
  transactions: Transaction[];
  plans?: Map<string, Plan>;
  showDetails?: boolean;
  emptyMessage?: string;
}

export function TransactionList({
  transactions,
  plans,
  showDetails = false,
  emptyMessage = "No transactions yet",
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div
        className="text-center py-12 text-muted-foreground"
        data-testid="transactions-empty"
      >
        <Receipt size={48} className="mx-auto mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="transaction-list">
      <AnimatePresence mode="popLayout">
        {transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            plan={plans?.get(transaction.planId || "")}
            showDetails={showDetails}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Transaction list skeleton
export function TransactionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" data-testid="transaction-list-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-white/5 border border-white/10 p-4 animate-pulse"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-white/10 mt-1" />
              <div className="space-y-2">
                <div className="h-5 w-32 bg-white/10 rounded" />
                <div className="h-4 w-24 bg-white/10 rounded" />
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="h-6 w-20 bg-white/10 rounded" />
              <div className="h-6 w-16 bg-white/10 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
