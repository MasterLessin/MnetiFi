import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Wifi,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  Smartphone,
  Upload,
  Download,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Plan } from "@shared/schema";

export default function HotspotPlansPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    durationSeconds: "3600",
    uploadLimit: "",
    downloadLimit: "",
    maxDevices: "1",
  });

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans?type=HOTSPOT"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const price = parseInt(data.price) || 0;
      const durationSeconds = parseInt(data.durationSeconds) || 3600;
      const maxDevices = parseInt(data.maxDevices) || 1;
      if (price <= 0) {
        throw new Error("Price must be a valid positive number");
      }
      return apiRequest("POST", "/api/plans", {
        name: data.name,
        description: data.description,
        price,
        planType: "HOTSPOT",
        durationSeconds,
        uploadLimit: data.uploadLimit || undefined,
        downloadLimit: data.downloadLimit || undefined,
        maxDevices,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans?type=HOTSPOT"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Plan Created",
        description: "Hotspot plan has been created successfully.",
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
      const durationSeconds = parseInt(data.durationSeconds) || 3600;
      const maxDevices = parseInt(data.maxDevices) || 1;
      if (price <= 0) {
        throw new Error("Price must be a valid positive number");
      }
      return apiRequest("PATCH", `/api/plans/${data.id}`, {
        name: data.name,
        description: data.description,
        price,
        durationSeconds,
        uploadLimit: data.uploadLimit || undefined,
        downloadLimit: data.downloadLimit || undefined,
        maxDevices,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans?type=HOTSPOT"] });
      setIsDialogOpen(false);
      setEditingPlan(null);
      resetForm();
      toast({
        title: "Plan Updated",
        description: "Hotspot plan has been updated successfully.",
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
      queryClient.invalidateQueries({ queryKey: ["/api/plans?type=HOTSPOT"] });
      toast({
        title: "Plan Deleted",
        description: "Hotspot plan has been deleted.",
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
      durationSeconds: "3600",
      uploadLimit: "",
      downloadLimit: "",
      maxDevices: "1",
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
      durationSeconds: plan.durationSeconds.toString(),
      uploadLimit: plan.uploadLimit || "",
      downloadLimit: plan.downloadLimit || "",
      maxDevices: plan.maxDevices?.toString() || "1",
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

  const formatDuration = (seconds: number) => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${seconds >= 7200 ? "s" : ""}`;
    return `${Math.floor(seconds / 86400)} day${seconds >= 172800 ? "s" : ""}`;
  };

  const durationPresets = [
    { label: "30 min", value: "1800" },
    { label: "1 hour", value: "3600" },
    { label: "3 hours", value: "10800" },
    { label: "1 day", value: "86400" },
    { label: "7 days", value: "604800" },
    { label: "30 days", value: "2592000" },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="hotspot-plans-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Hotspot Plans</h1>
          <p className="text-muted-foreground">
            Manage time-based WiFi packages for captive portal customers
          </p>
        </div>
        <Button className="gradient-btn" onClick={handleOpenCreate} data-testid="button-create-plan">
          <Plus size={18} className="mr-2" />
          Create Plan
        </Button>
      </div>

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
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Wifi size={24} className="text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{plan.name}</h3>
                    <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                      Hotspot
                    </Badge>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-3xl font-bold gradient-text">
                    {formatCurrency(plan.price)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    for {formatDuration(plan.durationSeconds)}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock size={14} className="text-green-400" />
                    <span>{formatDuration(plan.durationSeconds)} validity</span>
                  </div>
                  {plan.uploadLimit && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Upload size={14} className="text-cyan-400" />
                      <span>{plan.uploadLimit} upload</span>
                    </div>
                  )}
                  {plan.downloadLimit && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Download size={14} className="text-purple-400" />
                      <span>{plan.downloadLimit} download</span>
                    </div>
                  )}
                  {plan.maxDevices && plan.maxDevices > 1 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Smartphone size={14} className="text-amber-400" />
                      <span>{plan.maxDevices} devices</span>
                    </div>
                  )}
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
          <Wifi size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">No Hotspot Plans</h3>
          <p className="text-muted-foreground mb-4">
            Create your first hotspot plan to start accepting payments
          </p>
          <Button className="gradient-btn" onClick={handleOpenCreate}>
            <Plus size={18} className="mr-2" />
            Create First Plan
          </Button>
        </GlassPanel>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingPlan ? "Edit Hotspot Plan" : "Create Hotspot Plan"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                placeholder="e.g., Daily WiFi"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-plan-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={formData.durationSeconds}
                  onValueChange={(value) => setFormData({ ...formData, durationSeconds: value })}
                >
                  <SelectTrigger data-testid="select-duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {durationPresets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (KES)</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  data-testid="input-price"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Upload Limit (e.g., 2M)</Label>
                <Input
                  placeholder="2M"
                  value={formData.uploadLimit}
                  onChange={(e) => setFormData({ ...formData, uploadLimit: e.target.value })}
                  data-testid="input-upload-limit"
                />
              </div>
              <div className="space-y-2">
                <Label>Download Limit (e.g., 5M)</Label>
                <Input
                  placeholder="5M"
                  value={formData.downloadLimit}
                  onChange={(e) => setFormData({ ...formData, downloadLimit: e.target.value })}
                  data-testid="input-download-limit"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Devices per Voucher</Label>
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                  max="20"
                  placeholder="1"
                  value={formData.maxDevices}
                  onChange={(e) => setFormData({ ...formData, maxDevices: e.target.value })}
                  data-testid="input-max-devices"
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
