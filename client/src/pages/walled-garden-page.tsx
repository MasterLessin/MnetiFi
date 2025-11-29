import { useQuery, useMutation } from "@tanstack/react-query";
import { GlassPanel } from "@/components/glass-panel";
import { WalledGardenList } from "@/components/walled-garden";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WalledGarden } from "@shared/schema";
import { Globe, Info } from "lucide-react";

export default function WalledGardenPage() {
  const { toast } = useToast();

  // Fetch walled garden domains
  const { data: domains, isLoading } = useQuery<WalledGarden[]>({
    queryKey: ["/api/walled-gardens"],
  });

  // Add domain mutation
  const addMutation = useMutation({
    mutationFn: async (domain: string) => {
      return apiRequest("POST", "/api/walled-gardens", { domain });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/walled-gardens"] });
      toast({
        title: "Domain Added",
        description: "The domain has been added to the walled garden.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add domain",
        variant: "destructive",
      });
    },
  });

  // Remove domain mutation
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/walled-gardens/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/walled-gardens"] });
      toast({
        title: "Domain Removed",
        description: "The domain has been removed from the walled garden.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove domain",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6" data-testid="walled-garden-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Walled Garden</h1>
        <p className="text-muted-foreground">
          Configure domains accessible before user authentication
        </p>
      </div>

      {/* Info Card */}
      <GlassPanel size="sm" className="flex items-start gap-4 bg-cyan-500/5 border-cyan-500/20">
        <div className="p-2 rounded-lg bg-cyan-500/20">
          <Info size={20} className="text-cyan-400" />
        </div>
        <div>
          <h3 className="font-medium text-white mb-1">About Walled Garden</h3>
          <p className="text-sm text-muted-foreground">
            The walled garden allows users to access specific websites before authenticating
            to the hotspot. This is essential for M-Pesa payment processing, as users need
            to access Safaricom services to complete transactions.
          </p>
        </div>
      </GlassPanel>

      {/* Default Domains Info */}
      <GlassPanel size="sm" className="bg-purple-500/5 border-purple-500/20">
        <h3 className="font-medium text-white mb-3">Recommended Domains</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Globe size={14} className="text-purple-400" />
            <span className="text-muted-foreground">safaricom.co.ke</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              M-Pesa
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe size={14} className="text-purple-400" />
            <span className="text-muted-foreground">sandbox.safaricom.co.ke</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              Testing
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe size={14} className="text-purple-400" />
            <span className="text-muted-foreground">api.safaricom.co.ke</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              API
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe size={14} className="text-purple-400" />
            <span className="text-muted-foreground">mpesa.co.ke</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              Payments
            </span>
          </div>
        </div>
      </GlassPanel>

      {/* Domain List */}
      <GlassPanel size="md">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 bg-white/10 rounded" />
            <div className="h-4 w-48 bg-white/10 rounded" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-white/5 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <WalledGardenList
            domains={domains || []}
            onAdd={(domain) => addMutation.mutate(domain)}
            onRemove={(domain) => removeMutation.mutate(domain.id)}
          />
        )}
      </GlassPanel>
    </div>
  );
}
