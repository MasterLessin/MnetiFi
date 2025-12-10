import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";
import { motion } from "framer-motion";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  prefix?: React.ReactNode;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, label, error, icon, prefix, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          {prefix && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
              {prefix}
            </div>
          )}
          <motion.input
            ref={ref}
            className={cn(
              "w-full glass-input px-4 py-3 text-white placeholder:text-white/30",
              "focus:ring-2 focus:ring-primary/20 focus:border-white/30",
              "transition-all duration-200",
              icon && "pl-12",
              prefix && "pl-24",
              error && "border-destructive focus:ring-destructive/20",
              className
            )}
            whileFocus={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            {...props}
          />
        </div>
        {error && (
          <motion.p
            className="text-sm text-destructive"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";

// Phone input with Kenya flag prefix - digits only validation
interface PhoneInputProps extends Omit<GlassInputProps, "prefix" | "onChange"> {
  countryCode?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ countryCode = "+254", className, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow digits
      const value = e.target.value.replace(/[^\d]/g, "");
      // Limit to 9 digits (after 254 prefix) or 10 if starting with 0
      const maxLen = value.startsWith("0") ? 10 : 9;
      const truncated = value.slice(0, maxLen);
      
      // Create a new event with the sanitized value
      const newEvent = {
        ...e,
        target: {
          ...e.target,
          value: truncated,
        },
      } as React.ChangeEvent<HTMLInputElement>;
      
      if (onChange) {
        onChange(newEvent);
      }
    };

    return (
      <GlassInput
        ref={ref}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        prefix={
          <>
            <span className="text-lg" role="img" aria-label="Kenya flag">KE</span>
            <span className="text-sm font-medium text-white/60">{countryCode}</span>
          </>
        }
        placeholder="7XX XXX XXX"
        className={className}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

// Glass Textarea
interface GlassTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </label>
        )}
        <motion.textarea
          ref={ref}
          className={cn(
            "w-full glass-input px-4 py-3 text-white placeholder:text-white/30 min-h-[100px] resize-none",
            "focus:ring-2 focus:ring-primary/20 focus:border-white/30",
            "transition-all duration-200",
            error && "border-destructive focus:ring-destructive/20",
            className
          )}
          whileFocus={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          {...props}
        />
        {error && (
          <motion.p
            className="text-sm text-destructive"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

GlassTextarea.displayName = "GlassTextarea";
