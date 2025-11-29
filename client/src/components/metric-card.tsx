import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  gradient?: "primary" | "accent" | "mpesa";
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  gradient,
  className,
}: MetricCardProps) {
  const gradientClasses = {
    primary: "from-cyan-500/20 to-blue-500/20",
    accent: "from-purple-500/20 to-pink-500/20",
    mpesa: "from-green-500/20 to-emerald-500/20",
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp size={14} className="text-cyan-400" />;
    if (trend.value < 0) return <TrendingDown size={14} className="text-pink-400" />;
    return <Minus size={14} className="text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-cyan-400";
    if (trend.value < 0) return "text-pink-400";
    return "text-muted-foreground";
  };

  return (
    <motion.div
      className={cn(
        "rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6",
        "hover:bg-white/8 hover:border-white/15 transition-all duration-300",
        gradient && `bg-gradient-to-br ${gradientClasses[gradient]}`,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div>
            <span className="text-3xl font-bold text-white">{value}</span>
            {subtitle && (
              <span className="ml-2 text-sm text-muted-foreground">{subtitle}</span>
            )}
          </div>
          {trend && (
            <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && (
                <span className="text-muted-foreground ml-1">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl bg-white/5 text-muted-foreground">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// Metric card skeleton
export function MetricCardSkeleton() {
  return (
    <div
      className="rounded-2xl bg-white/5 border border-white/10 p-6 animate-pulse"
      data-testid="metric-card-skeleton"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="h-4 w-24 bg-white/10 rounded" />
          <div className="h-8 w-32 bg-white/10 rounded" />
          <div className="h-4 w-20 bg-white/10 rounded" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/10" />
      </div>
    </div>
  );
}

// Compact metric for sidebar or header
interface CompactMetricProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

export function CompactMetric({ label, value, icon }: CompactMetricProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5"
      data-testid={`compact-metric-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}
