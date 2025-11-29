import { motion } from "framer-motion";
import { Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

interface MnetiFiLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export function MnetiFiLogo({ size = "md", showText = true, className }: MnetiFiLogoProps) {
  const sizeConfig = {
    sm: { icon: 20, text: "text-lg", gap: "gap-2" },
    md: { icon: 28, text: "text-2xl", gap: "gap-2" },
    lg: { icon: 36, text: "text-3xl", gap: "gap-3" },
    xl: { icon: 48, text: "text-4xl", gap: "gap-4" },
  };

  const config = sizeConfig[size];

  return (
    <motion.div
      className={cn("flex items-center", config.gap, className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      data-testid="mnetifi-logo"
    >
      <motion.div
        className="relative"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        {/* Gradient glow behind icon */}
        <div
          className="absolute inset-0 rounded-full blur-lg opacity-60"
          style={{
            background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
          }}
        />
        <div
          className="relative flex items-center justify-center rounded-xl p-2"
          style={{
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
            border: "1px solid rgba(6, 182, 212, 0.3)",
          }}
        >
          <Wifi
            size={config.icon}
            className="text-cyan-400"
            strokeWidth={2.5}
          />
        </div>
      </motion.div>
      
      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              "font-bold tracking-tight gradient-text",
              config.text
            )}
          >
            MnetiFi
          </span>
          {size !== "sm" && (
            <span className="text-xs text-muted-foreground tracking-wide uppercase">
              Wi-Fi Billing
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// M-Pesa Logo component
export function MpesaLogo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-testid="mpesa-logo"
    >
      <circle cx="12" cy="12" r="11" fill="#4BB617" />
      <path
        d="M7 12L10 15L17 8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
