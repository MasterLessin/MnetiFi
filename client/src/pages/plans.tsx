import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Clock, Upload, Download, Users, Smartphone, X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput, GlassTextarea } from "@/components/glass-input";
import { PlanCard, PlanCardSkeleton } from "@/components/plan-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Plan, InsertPlan } from "@shared/schema";

export default function PlansPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<InsertPlan>>({
    name: "",
    description: "",
    price: 0,
    durationSeconds: 3600,
    uploadLimit: "",
    downloadLimit: "",
    simultaneousUse: 1,
    maxDevices: 1,
  });

  // Fetch plans
  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<InsertPlan>) => {
      if (editingPlan) {
        return apiRequest("PATCH", `/api/plans/${editingPlan.id}`, data);
      }
      return apiRequest("POST", "/api/plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({
        title: editingPlan ? "Plan Updated" : "Plan Created",
        description: `The plan has been ${editingPlan ? "updated" : "created"} successfully.`,
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save plan",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({
        title: "Plan Deleted",
        description: "The plan has been deleted successfully.",
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

  const handleOpenDialog = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || "",
        price: plan.price,
        durationSeconds: plan.durationSeconds,
        uploadLimit: plan.uploadLimit || "",
        downloadLimit: plan.downloadLimit || "",
        simultaneousUse: plan.simultaneousUse || 1,
        maxDevices: plan.maxDevices || 1,
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: "",
        description: "",
        price: 0,
        durationSeconds: 3600,
        uploadLimit: "",
        downloadLimit: "",
        simultaneousUse: 1,
        maxDevices: 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      durationSeconds: 3600,
      uploadLimit: "",
      downloadLimit: "",
      simultaneousUse: 1,
      maxDevices: 1,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const durationPresets = [
    { label: "30 min", seconds: 1800 },
    { label: "1 hour", seconds: 3600 },
    { label: "3 hours", seconds: 10800 },
    { label: "1 day", seconds: 86400 },
    { label: "7 days", seconds: 604800 },
    { label: "30 days", seconds: 2592000 },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="plans-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Plans</h1>
          <p className="text-muted-foreground">
            Manage Wi-Fi subscription plans and pricing
          </p>
        </div>
        <Button
          className="gradient-btn"
          onClick={() => handleOpenDialog()}
          data-testid="button-add-plan"
        >
          <Plus size={18} className="mr-2" />
          Add Plan
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <PlanCardSkeleton />
            <PlanCardSkeleton />
            <PlanCardSkeleton />
          </>
        ) : plans && plans.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <PlanCard
                  plan={plan}
                  onSelect={() => handleOpenDialog(plan)}
                  showDetails
                />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <GlassPanel className="col-span-full text-center py-12">
            <Clock size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No plans created yet</p>
            <Button
              className="gradient-btn"
              onClick={() => handleOpenDialog()}
              data-testid="button-create-first-plan"
            >
              Create Your First Plan
            </Button>
          </GlassPanel>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-panel border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingPlan ? "Edit Plan" : "Create New Plan"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <GlassInput
              label="Plan Name"
              placeholder="e.g., Basic, Premium, Unlimited"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-testid="input-plan-name"
            />

            <GlassTextarea
              label="Description"
              placeholder="Brief description of this plan"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="input-plan-description"
            />

            <GlassInput
              label="Price (KES)"
              type="number"
              placeholder="0"
              value={formData.price?.toString() || ""}
              onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
              required
              data-testid="input-plan-price"
            />

            {/* Duration presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.seconds}
                    type="button"
                    onClick={() => setFormData({ ...formData, durationSeconds: preset.seconds })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      formData.durationSeconds === preset.seconds
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
                    )}
                    data-testid={`duration-preset-${preset.seconds}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <GlassInput
                label="Upload Limit"
                placeholder="e.g., 2M"
                value={formData.uploadLimit || ""}
                onChange={(e) => setFormData({ ...formData, uploadLimit: e.target.value })}
                icon={<Upload size={16} />}
                data-testid="input-plan-upload"
              />
              <GlassInput
                label="Download Limit"
                placeholder="e.g., 5M"
                value={formData.downloadLimit || ""}
                onChange={(e) => setFormData({ ...formData, downloadLimit: e.target.value })}
                icon={<Download size={16} />}
                data-testid="input-plan-download"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <GlassInput
                label="Simultaneous Sessions"
                type="number"
                min={1}
                max={10}
                value={formData.simultaneousUse?.toString() || "1"}
                onChange={(e) => setFormData({ ...formData, simultaneousUse: parseInt(e.target.value) || 1 })}
                icon={<Users size={16} />}
                data-testid="input-plan-devices"
              />
              <GlassInput
                label="Max Devices per Voucher"
                type="number"
                min={1}
                max={20}
                value={formData.maxDevices?.toString() || "1"}
                onChange={(e) => setFormData({ ...formData, maxDevices: parseInt(e.target.value) || 1 })}
                icon={<Smartphone size={16} />}
                data-testid="input-plan-max-devices"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCloseDialog}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              {editingPlan && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    deleteMutation.mutate(editingPlan.id);
                    handleCloseDialog();
                  }}
                  className="text-destructive hover:text-destructive"
                  data-testid="button-delete-plan"
                >
                  Delete
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1 gradient-btn"
                disabled={saveMutation.isPending}
                data-testid="button-save-plan"
              >
                {saveMutation.isPending ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
