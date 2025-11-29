import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";
import type { TransactionStatusType } from "@shared/schema";

interface StatusBadgeProps {
  status: TransactionStatusType;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = "md",
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-1.5 text-base gap-2",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const statusConfig = {
    PENDING: {
      bg: "bg-purple-500/20",
      text: "text-purple-300",
      border: "border-purple-500/30",
      icon: <Loader2 size={iconSizes[size]} className="animate-spin" />,
      label: "Pending",
      glow: "shadow-glow-purple",
    },
    COMPLETED: {
      bg: "bg-cyan-500/20",
      text: "text-cyan-300",
      border: "border-cyan-500/30",
      icon: <Check size={iconSizes[size]} />,
      label: "Completed",
      glow: "shadow-glow",
    },
    FAILED: {
      bg: "bg-pink-500/20",
      text: "text-pink-300",
      border: "border-pink-500/30",
      icon: <X size={iconSizes[size]} />,
      label: "Failed",
      glow: "shadow-glow-magenta",
    },
  };

  const config = statusConfig[status];

  return (
    <motion.span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        sizeClasses[size],
        config.bg,
        config.text,
        config.border,
        status === "PENDING" && "animate-pulse",
        className
      )}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      data-testid={`status-badge-${status.toLowerCase()}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </motion.span>
  );
}

// Status indicator dot
interface StatusDotProps {
  status: TransactionStatusType;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

export function StatusDot({ status, size = "md", pulse = true }: StatusDotProps) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const statusColors = {
    PENDING: "bg-purple-400",
    COMPLETED: "bg-cyan-400",
    FAILED: "bg-pink-400",
  };

  return (
    <span className="relative flex">
      {pulse && status === "PENDING" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            statusColors[status]
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          sizeClasses[size],
          statusColors[status]
        )}
        data-testid={`status-dot-${status.toLowerCase()}`}
      />
    </span>
  );
}
