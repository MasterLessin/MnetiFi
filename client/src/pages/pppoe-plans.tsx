import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Router,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Zap,
  Clock,
  Check,
  X,
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Plan } from "@shared/schema";

export default function PPPoEPlansPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    speedMbps: "",
    uploadLimit: "",
    downloadLimit: "",
  });

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans", "PPPOE"],
    queryFn: async () => {
      const res = await fetch("/api/plans?type=PPPOE");
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const price = parseInt(data.price) || 0;
      const speedMbps = parseInt(data.speedMbps) || 0;
      if (price <= 0 || speedMbps <= 0) {
        throw new Error("Price and speed must be valid positive numbers");
      }
      return apiRequest("POST", "/api/plans", {
        name: data.name,
        description: data.description,
        price,
        planType: "PPPOE",
        speedMbps,
        durationSeconds: 30 * 24 * 60 * 60, // 30 days
        uploadLimit: data.uploadLimit || `${speedMbps}M`,
        downloadLimit: data.downloadLimit || `${speedMbps}M`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Plan Created",
        description: "PPPoE plan has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create plan",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const price = parseInt(data.price) || 0;
      const speedMbps = parseInt(data.speedMbps) || 0;
      if (price <= 0 || speedMbps <= 0) {
        throw new Error("Price and speed must be valid positive numbers");
      }
      return apiRequest("PATCH", `/api/plans/${data.id}`, {
        name: data.name,
        description: data.description,
        price,
        speedMbps,
        uploadLimit: data.uploadLimit || `${speedMbps}M`,
        downloadLimit: data.downloadLimit || `${speedMbps}M`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsDialogOpen(false);
      setEditingPlan(null);
      resetForm();
      toast({
        title: "Plan Updated",
        description: "PPPoE plan has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update plan",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({
        title: "Plan Deleted",
        description: "PPPoE plan has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete plan",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      speedMbps: "",
      uploadLimit: "",
      downloadLimit: "",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price: plan.price.toString(),
      speedMbps: plan.speedMbps?.toString() || "",
      uploadLimit: plan.uploadLimit || "",
      downloadLimit: plan.downloadLimit || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updateMutation.mutate({ ...formData, id: editingPlan.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6" data-testid="pppoe-plans-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">PPPoE Plans</h1>
          <p className="text-muted-foreground">
            Manage monthly broadband packages with different speeds
          </p>
        </div>
        <Button className="gradient-btn" onClick={handleOpenCreate} data-testid="button-create-plan">
          <Plus size={18} className="mr-2" />
          Create Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse glass-panel p-6">
              <div className="h-6 bg-white/10 rounded w-2/3 mb-4" />
              <div className="h-10 bg-white/10 rounded w-1/2 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : plans && plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassPanel size="md" className="relative">
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenEdit(plan)}
                    data-testid={`button-edit-plan-${plan.id}`}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(plan.id)}
                    data-testid={`button-delete-plan-${plan.id}`}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Router size={24} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{plan.name}</h3>
                    <Badge variant="outline" className="text-xs bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      PPPoE
                    </Badge>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-3xl font-bold gradient-text">
                    {formatCurrency(plan.price)}
                  </p>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>

                <div className="space-y-2 text-sm">
                  {plan.speedMbps && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap size={14} className="text-cyan-400" />
                      <span>{plan.speedMbps} Mbps Speed</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock size={14} className="text-purple-400" />
                    <span>30 Days Validity</span>
                  </div>
                  {plan.description && (
                    <p className="text-muted-foreground mt-2">{plan.description}</p>
                  )}
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      ) : (
        <GlassPanel size="lg" className="text-center py-12">
          <Router size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">No PPPoE Plans</h3>
          <p className="text-muted-foreground mb-4">
            Create your first PPPoE plan to start managing broadband customers
          </p>
          <Button className="gradient-btn" onClick={handleOpenCreate}>
            <Plus size={18} className="mr-2" />
            Create First Plan
          </Button>
        </GlassPanel>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingPlan ? "Edit PPPoE Plan" : "Create PPPoE Plan"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                placeholder="e.g., Basic 5 Mbps"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-plan-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Speed (Mbps)</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={formData.speedMbps}
                  onChange={(e) => setFormData({ ...formData, speedMbps: e.target.value })}
                  required
                  data-testid="input-speed"
                />
              </div>
              <div className="space-y-2">
                <Label>Price (KES/month)</Label>
                <Input
                  type="number"
                  placeholder="1500"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  data-testid="input-price"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Plan description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-description"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gradient-btn"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-plan"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                {editingPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
