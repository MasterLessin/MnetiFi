import { motion, AnimatePresence } from "framer-motion";
import { Globe, Plus, X, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WalledGarden } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { GlassInput } from "./glass-input";
import { useState } from "react";

interface WalledGardenListProps {
  domains: WalledGarden[];
  onAdd?: (domain: string, description?: string) => void;
  onRemove?: (domain: WalledGarden) => void;
  readOnly?: boolean;
}

export function WalledGardenList({
  domains,
  onAdd,
  onRemove,
  readOnly = false,
}: WalledGardenListProps) {
  const [newDomain, setNewDomain] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newDomain.trim()) {
      onAdd?.(newDomain.trim());
      setNewDomain("");
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="walled-garden-list">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Walled Garden</h3>
        </div>
        {!readOnly && !isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="text-cyan-400 hover:text-cyan-300"
            data-testid="button-add-domain"
          >
            <Plus size={16} className="mr-1" />
            Add Domain
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Domains that users can access before authentication (e.g., for M-Pesa payments)
      </p>

      {/* Add domain form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <div className="flex-1">
              <GlassInput
                placeholder="e.g., safaricom.co.ke"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                data-testid="input-new-domain"
              />
            </div>
            <Button onClick={handleAdd} className="gradient-btn" data-testid="button-confirm-domain">
              Add
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setNewDomain("");
              }}
              data-testid="button-cancel-domain"
            >
              Cancel
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Domain list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {domains.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
              data-testid="walled-garden-empty"
            >
              <Globe size={32} className="mx-auto mb-2 opacity-50" />
              <p>No domains configured</p>
            </motion.div>
          ) : (
            domains.map((domain) => (
              <WalledGardenItem
                key={domain.id}
                domain={domain}
                onRemove={onRemove}
                readOnly={readOnly}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface WalledGardenItemProps {
  domain: WalledGarden;
  onRemove?: (domain: WalledGarden) => void;
  readOnly?: boolean;
}

function WalledGardenItem({ domain, onRemove, readOnly }: WalledGardenItemProps) {
  return (
    <motion.div
      className={cn(
        "flex items-center justify-between gap-4 p-3 rounded-xl",
        "bg-white/5 border border-white/10",
        !domain.isActive && "opacity-50"
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      layout
      data-testid={`walled-garden-item-${domain.id}`}
    >
      <div className="flex items-center gap-3">
        <Globe size={16} className="text-muted-foreground" />
        <div>
          <span className="text-white font-medium">{domain.domain}</span>
          {domain.description && (
            <p className="text-xs text-muted-foreground">{domain.description}</p>
          )}
        </div>
      </div>

      {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove?.(domain)}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          data-testid={`button-remove-domain-${domain.id}`}
        >
          <X size={14} />
        </Button>
      )}
    </motion.div>
  );
}

// Compact walled garden display for captive portal
interface WalledGardenFooterProps {
  domains: WalledGarden[];
}

export function WalledGardenFooter({ domains }: WalledGardenFooterProps) {
  if (domains.length === 0) return null;

  return (
    <div
      className="mt-6 pt-4 border-t border-white/10 text-center"
      data-testid="walled-garden-footer"
    >
      <p className="text-xs text-muted-foreground mb-2">
        You can access these sites before connecting:
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {domains.slice(0, 5).map((domain) => (
          <span
            key={domain.id}
            className="px-2 py-1 rounded-full bg-white/5 text-xs text-muted-foreground"
          >
            {domain.domain}
          </span>
        ))}
        {domains.length > 5 && (
          <span className="px-2 py-1 rounded-full bg-white/5 text-xs text-muted-foreground">
            +{domains.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
}
