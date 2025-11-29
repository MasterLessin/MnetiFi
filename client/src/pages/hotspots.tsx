import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Wifi, Server, Shield } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput, GlassTextarea } from "@/components/glass-input";
import { HotspotCard, HotspotCardSkeleton, AddHotspotButton } from "@/components/hotspot-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Hotspot, InsertHotspot } from "@shared/schema";

export default function HotspotsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHotspot, setEditingHotspot] = useState<Hotspot | null>(null);
  const [deletingHotspot, setDeletingHotspot] = useState<Hotspot | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<InsertHotspot>>({
    locationName: "",
    description: "",
    nasIp: "",
    secret: "",
  });

  // Fetch hotspots
  const { data: hotspots, isLoading } = useQuery<Hotspot[]>({
    queryKey: ["/api/hotspots"],
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<InsertHotspot>) => {
      if (editingHotspot) {
        return apiRequest("PATCH", `/api/hotspots/${editingHotspot.id}`, data);
      }
      return apiRequest("POST", "/api/hotspots", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hotspots"] });
      toast({
        title: editingHotspot ? "Hotspot Updated" : "Hotspot Created",
        description: `The hotspot has been ${editingHotspot ? "updated" : "created"} successfully.`,
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save hotspot",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/hotspots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hotspots"] });
      toast({
        title: "Hotspot Deleted",
        description: "The hotspot has been deleted successfully.",
      });
      setDeletingHotspot(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete hotspot",
        variant: "destructive",
      });
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async (hotspot: Hotspot) => {
      return apiRequest("PATCH", `/api/hotspots/${hotspot.id}`, {
        isActive: !hotspot.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hotspots"] });
      toast({
        title: "Hotspot Updated",
        description: "The hotspot status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update hotspot",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (hotspot?: Hotspot) => {
    if (hotspot) {
      setEditingHotspot(hotspot);
      setFormData({
        locationName: hotspot.locationName,
        description: hotspot.description || "",
        nasIp: hotspot.nasIp,
        secret: hotspot.secret,
      });
    } else {
      setEditingHotspot(null);
      setFormData({
        locationName: "",
        description: "",
        nasIp: "",
        secret: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingHotspot(null);
    setFormData({
      locationName: "",
      description: "",
      nasIp: "",
      secret: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  // Generate random secret
  const generateSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let secret = "";
    for (let i = 0; i < 16; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, secret });
  };

  return (
    <div className="p-6 space-y-6" data-testid="hotspots-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hotspots</h1>
          <p className="text-muted-foreground">
            Manage your hotspot locations and NAS devices
          </p>
        </div>
        <Button
          className="gradient-btn"
          onClick={() => handleOpenDialog()}
          data-testid="button-add-hotspot"
        >
          <Plus size={18} className="mr-2" />
          Add Hotspot
        </Button>
      </div>

      {/* Hotspots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <HotspotCardSkeleton />
            <HotspotCardSkeleton />
            <HotspotCardSkeleton />
          </>
        ) : hotspots && hotspots.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {hotspots.map((hotspot) => (
              <HotspotCard
                key={hotspot.id}
                hotspot={hotspot}
                onEdit={handleOpenDialog}
                onDelete={setDeletingHotspot}
                onToggleActive={(h) => toggleMutation.mutate(h)}
              />
            ))}
            <AddHotspotButton onClick={() => handleOpenDialog()} />
          </AnimatePresence>
        ) : (
          <GlassPanel className="col-span-full text-center py-12">
            <Wifi size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No hotspots configured yet</p>
            <Button
              className="gradient-btn"
              onClick={() => handleOpenDialog()}
              data-testid="button-create-first-hotspot"
            >
              Add Your First Hotspot
            </Button>
          </GlassPanel>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-panel border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingHotspot ? "Edit Hotspot" : "Add New Hotspot"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <GlassInput
              label="Location Name"
              placeholder="e.g., Main Lobby, Cafe Area"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              required
              data-testid="input-hotspot-name"
            />

            <GlassTextarea
              label="Description"
              placeholder="Brief description of this location"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="input-hotspot-description"
            />

            <GlassInput
              label="NAS IP Address"
              placeholder="e.g., 192.168.1.1"
              value={formData.nasIp}
              onChange={(e) => setFormData({ ...formData, nasIp: e.target.value })}
              icon={<Server size={16} />}
              required
              data-testid="input-hotspot-ip"
            />

            <div className="space-y-2">
              <GlassInput
                label="RADIUS Secret"
                placeholder="Enter secret or generate one"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                icon={<Shield size={16} />}
                required
                data-testid="input-hotspot-secret"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateSecret}
                className="text-cyan-400 hover:text-cyan-300"
                data-testid="button-generate-secret"
              >
                Generate Random Secret
              </Button>
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
              <Button
                type="submit"
                className="flex-1 gradient-btn"
                disabled={saveMutation.isPending}
                data-testid="button-save-hotspot"
              >
                {saveMutation.isPending ? "Saving..." : editingHotspot ? "Update Hotspot" : "Add Hotspot"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingHotspot} onOpenChange={() => setDeletingHotspot(null)}>
        <AlertDialogContent className="glass-panel border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Hotspot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingHotspot?.locationName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingHotspot && deleteMutation.mutate(deletingHotspot.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
