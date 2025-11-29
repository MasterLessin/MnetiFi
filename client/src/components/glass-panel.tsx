import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
  glow?: "cyan" | "purple" | "magenta" | "mpesa" | "none";
  size?: "sm" | "md" | "lg";
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, children, hover = false, glow = "none", size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "p-4 rounded-xl",
      md: "p-6 rounded-2xl",
      lg: "p-8 rounded-3xl",
    };

    const glowClasses = {
      none: "",
      cyan: "shadow-glow",
      purple: "shadow-glow-purple",
      magenta: "shadow-glow-magenta",
      mpesa: "shadow-glow-mpesa",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "glass-panel",
          sizeClasses[size],
          glowClasses[glow],
          hover && "glass-panel-hover cursor-pointer",
          className
        )}
        whileHover={hover ? { y: -4 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

// Glass Card variant for plan cards with gradient top border
interface GlassCardProps extends GlassPanelProps {
  gradient?: "primary" | "accent" | "mpesa";
  selected?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, gradient, selected = false, ...props }, ref) => {
    const gradientClasses = {
      primary: "before:bg-gradient-primary",
      accent: "before:bg-gradient-accent",
      mpesa: "before:bg-gradient-mpesa",
    };

    return (
      <GlassPanel
        ref={ref}
        className={cn(
          "relative overflow-visible",
          gradient && [
            "before:absolute before:inset-x-0 before:top-0 before:h-1 before:rounded-t-2xl",
            gradientClasses[gradient],
          ],
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          className
        )}
        hover
        {...props}
      >
        {children}
      </GlassPanel>
    );
  }
);

GlassCard.displayName = "GlassCard";
