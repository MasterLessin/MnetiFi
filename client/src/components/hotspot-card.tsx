import { motion } from "framer-motion";
import { Wifi, MapPin, Server, Shield, MoreVertical, Power, PowerOff, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Hotspot } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface HotspotCardProps {
  hotspot: Hotspot;
  onEdit?: (hotspot: Hotspot) => void;
  onDelete?: (hotspot: Hotspot) => void;
  onToggleActive?: (hotspot: Hotspot) => void;
}

export function HotspotCard({ hotspot, onEdit, onDelete, onToggleActive }: HotspotCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl bg-white/5 backdrop-blur-xl border transition-all duration-300",
        hotspot.isActive ? "border-white/10" : "border-white/5 opacity-60",
        "hover:border-white/20 group"
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      data-testid={`hotspot-card-${hotspot.id}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          {/* Icon and status */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "p-3 rounded-xl",
                hotspot.isActive
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "bg-white/5 text-muted-foreground"
              )}
            >
              <Wifi size={24} />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">{hotspot.locationName}</h3>
              {hotspot.description && (
                <p className="text-sm text-muted-foreground mt-1">{hotspot.description}</p>
              )}
            </div>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`hotspot-menu-${hotspot.id}`}
              >
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-white/10">
              <DropdownMenuItem
                onClick={() => onEdit?.(hotspot)}
                className="cursor-pointer"
                data-testid={`hotspot-edit-${hotspot.id}`}
              >
                <Edit size={14} className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleActive?.(hotspot)}
                className="cursor-pointer"
                data-testid={`hotspot-toggle-${hotspot.id}`}
              >
                {hotspot.isActive ? (
                  <>
                    <PowerOff size={14} className="mr-2" />
                    Disable
                  </>
                ) : (
                  <>
                    <Power size={14} className="mr-2" />
                    Enable
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(hotspot)}
                className="cursor-pointer text-destructive focus:text-destructive"
                data-testid={`hotspot-delete-${hotspot.id}`}
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Details */}
        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Server size={14} className="text-blue-400" />
            <span className="font-mono text-xs">{hotspot.nasIp}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield size={14} className="text-purple-400" />
            <span className="font-mono text-xs">
              {hotspot.secret.slice(0, 4)}****
            </span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              hotspot.isActive ? "bg-cyan-400" : "bg-gray-500"
            )}
          />
          <span className="text-xs text-muted-foreground">
            {hotspot.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Hotspot card skeleton
export function HotspotCardSkeleton() {
  return (
    <div
      className="rounded-2xl bg-white/5 border border-white/10 p-5 animate-pulse"
      data-testid="hotspot-card-skeleton"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-32 bg-white/10 rounded" />
          <div className="h-4 w-48 bg-white/10 rounded" />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
        <div className="h-4 w-24 bg-white/10 rounded" />
        <div className="h-4 w-20 bg-white/10 rounded" />
      </div>
    </div>
  );
}

// Add hotspot button
interface AddHotspotButtonProps {
  onClick?: () => void;
}

export function AddHotspotButton({ onClick }: AddHotspotButtonProps) {
  return (
    <motion.button
      className={cn(
        "w-full rounded-2xl border-2 border-dashed border-white/10 p-8",
        "hover:border-cyan-500/30 hover:bg-white/5 transition-all duration-200",
        "flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-white"
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      data-testid="button-add-hotspot"
    >
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
        <MapPin size={24} />
      </div>
      <span className="font-medium">Add Hotspot Location</span>
    </motion.button>
  );
}
