import { motion } from "framer-motion";
import { Clock, Download, Upload, Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@shared/schema";

interface PlanCardProps {
  plan: Plan;
  selected?: boolean;
  onSelect?: (plan: Plan) => void;
  showDetails?: boolean;
}

export function PlanCard({ plan, selected = false, onSelect, showDetails = true }: PlanCardProps) {
  // Format duration for display
  const formatDuration = (seconds: number) => {
    if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} min`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    } else {
      const days = Math.floor(seconds / 86400);
      return `${days} day${days > 1 ? "s" : ""}`;
    }
  };

  // Format price for display (KES)
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl cursor-pointer",
        "bg-white/5 backdrop-blur-xl border transition-all duration-300",
        selected
          ? "border-cyan-500/50 ring-2 ring-cyan-500/30"
          : "border-white/10 hover:border-white/20",
        "group"
      )}
      onClick={() => onSelect?.(plan)}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      data-testid={`plan-card-${plan.id}`}
    >
      {/* Gradient top border */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 transition-opacity duration-300",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        style={{
          background: "linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%)",
        }}
      />

      {/* Selected check indicator */}
      {selected && (
        <motion.div
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          <Check size={14} className="text-white" strokeWidth={3} />
        </motion.div>
      )}

      <div className="p-6">
        {/* Plan name */}
        <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>

        {/* Price */}
        <div className="mb-4">
          <span className="text-3xl font-bold gradient-text">
            {formatPrice(plan.price)}
          </span>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Clock size={16} />
          <span className="text-sm">{formatDuration(plan.durationSeconds)}</span>
        </div>

        {showDetails && (
          <div className="space-y-2 pt-4 border-t border-white/10">
            {/* Upload limit */}
            {plan.uploadLimit && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Upload size={14} className="text-cyan-400" />
                <span>Upload: {plan.uploadLimit}</span>
              </div>
            )}

            {/* Download limit */}
            {plan.downloadLimit && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download size={14} className="text-blue-400" />
                <span>Download: {plan.downloadLimit}</span>
              </div>
            )}

            {/* Simultaneous use */}
            {plan.simultaneousUse && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users size={14} className="text-purple-400" />
                <span>{plan.simultaneousUse} device{plan.simultaneousUse > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {plan.description && (
          <p className="mt-4 text-sm text-muted-foreground">{plan.description}</p>
        )}
      </div>
    </motion.div>
  );
}

// Plan card skeleton for loading state
export function PlanCardSkeleton() {
  return (
    <div
      className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 animate-pulse"
      data-testid="plan-card-skeleton"
    >
      <div className="h-6 w-24 bg-white/10 rounded mb-2" />
      <div className="h-10 w-20 bg-white/10 rounded mb-4" />
      <div className="h-4 w-16 bg-white/10 rounded mb-4" />
      <div className="space-y-2 pt-4 border-t border-white/10">
        <div className="h-4 w-32 bg-white/10 rounded" />
        <div className="h-4 w-28 bg-white/10 rounded" />
      </div>
    </div>
  );
}

// Compact plan card for transaction display
interface CompactPlanCardProps {
  plan: Plan;
}

export function CompactPlanCard({ plan }: CompactPlanCardProps) {
  const formatDuration = (seconds: number) => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
      data-testid={`compact-plan-${plan.id}`}
    >
      <span className="text-sm font-medium text-white">{plan.name}</span>
      <span className="text-xs text-muted-foreground">
        {formatDuration(plan.durationSeconds)}
      </span>
    </div>
  );
}
