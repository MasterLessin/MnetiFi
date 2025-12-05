import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Router,
  Plus,
  Search,
  Phone,
  User,
  Mail,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  MoreVertical,
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WifiUser, Plan } from "@shared/schema";
import { format } from "date-fns";

export default function TechPPPoEUsersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<WifiUser | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    username: "",
    password: "",
    planId: "",
  });

  const { data: users, isLoading: usersLoading } = useQuery<WifiUser[]>({
    queryKey: ["/api/wifi-users", "PPPOE"],
    queryFn: async () => {
      const res = await fetch("/api/wifi-users?type=PPPOE");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans", "PPPOE"],
    queryFn: async () => {
      const res = await fetch("/api/plans?type=PPPOE");
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/wifi-users", {
        ...data,
        accountType: "PPPOE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wifi-users"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "User Created",
        description: "PPPoE user has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      return apiRequest("PATCH", `/api/wifi-users/${data.id}`, {
        ...data,
        accountType: "PPPOE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wifi-users"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      resetForm();
      toast({
        title: "User Updated",
        description: "PPPoE user has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      fullName: "",
      phoneNumber: "",
      email: "",
      username: "",
      password: "",
      planId: "",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: WifiUser) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName || "",
      phoneNumber: user.phoneNumber,
      email: user.email || "",
      username: user.username || "",
      password: "",
      planId: user.currentPlanId || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateMutation.mutate({ ...formData, id: editingUser.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredUsers = users?.filter((user) => {
    const search = searchQuery.toLowerCase();
    return (
      user.fullName?.toLowerCase().includes(search) ||
      user.phoneNumber.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            <CheckCircle size={12} className="mr-1" />
            Active
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Clock size={12} className="mr-1" />
            Expired
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle size={12} className="mr-1" />
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
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
    <div className="p-6 space-y-6" data-testid="tech-pppoe-users-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">PPPoE Users</h1>
          <p className="text-muted-foreground">
            Manage broadband customers with monthly billing
          </p>
        </div>
        <Button className="gradient-btn" onClick={handleOpenCreate} data-testid="button-add-user">
          <Plus size={18} className="mr-2" />
          Add PPPoE User
        </Button>
      </div>

      {/* Search */}
      <GlassPanel size="sm">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <GlassInput
              placeholder="Search by name, phone, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={16} />}
              data-testid="input-search"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Users List */}
      {usersLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse glass-panel p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/4" />
                <div className="h-3 bg-white/10 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredUsers && filteredUsers.length > 0 ? (
        <div className="space-y-4">
          {filteredUsers.map((user, index) => {
            const plan = plans?.find((p) => p.id === user.currentPlanId);
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassPanel size="sm" className="flex items-center gap-4 p-4">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Router size={20} className="text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white truncate">
                        {user.fullName || user.username || "Unnamed User"}
                      </p>
                      {getStatusBadge(user.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone size={12} />
                        {user.phoneNumber}
                      </span>
                      {user.username && (
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {user.username}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    {plan && (
                      <p className="font-semibold text-white">{plan.name}</p>
                    )}
                    {user.expiryTime && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {format(new Date(user.expiryTime), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-menu-${user.id}`}>
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(user)}>
                        <Pencil size={14} className="mr-2" />
                        Edit User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </GlassPanel>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <GlassPanel size="lg" className="text-center py-12">
          <Router size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">No PPPoE Users</h3>
          <p className="text-muted-foreground mb-4">
            Add your first PPPoE customer to get started
          </p>
          <Button className="gradient-btn" onClick={handleOpenCreate}>
            <Plus size={18} className="mr-2" />
            Add First User
          </Button>
        </GlassPanel>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingUser ? "Edit PPPoE User" : "Add PPPoE User"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  data-testid="input-fullname"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  placeholder="0712345678"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  required
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-email"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PPPoE Username</Label>
                <Input
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label>PPPoE Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  data-testid="input-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Plan</Label>
              <Select
                value={formData.planId}
                onValueChange={(value) => setFormData({ ...formData, planId: value })}
              >
                <SelectTrigger data-testid="select-plan">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.price)}/month
                      {plan.speedMbps && ` (${plan.speedMbps} Mbps)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                data-testid="button-submit"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
