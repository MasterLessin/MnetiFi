import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Users, 
  Phone, 
  Mail, 
  Wifi, 
  Router,
  Clock,
  Search,
  MoreVertical,
  RefreshCw,
  Ban,
  Play,
  ArrowRightLeft,
  UserCircle,
  Eye,
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput, GlassTextarea } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { WifiUser, InsertWifiUser, Plan, Hotspot, User } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

const accountTypeLabels = {
  HOTSPOT: "Hotspot",
  PPPOE: "PPPoE",
  STATIC: "Static IP",
};

const statusColors = {
  ACTIVE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  SUSPENDED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  EXPIRED: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function WifiUsersPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<WifiUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAccountType, setFilterAccountType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState<Partial<InsertWifiUser>>({
    phoneNumber: "",
    email: "",
    fullName: "",
    accountType: "HOTSPOT",
    username: "",
    password: "",
    macAddress: "",
    ipAddress: "",
    notes: "",
    technicianId: "",
  });

  const { data: wifiUsers, isLoading } = useQuery<WifiUser[]>({
    queryKey: ["/api/wifi-users"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: hotspots } = useQuery<Hotspot[]>({
    queryKey: ["/api/hotspots"],
  });

  const { data: technicians } = useQuery<User[]>({
    queryKey: ["/api/users/technicians"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<InsertWifiUser>) => {
      if (editingUser) {
        return apiRequest("PATCH", `/api/wifi-users/${editingUser.id}`, data);
      }
      return apiRequest("POST", "/api/wifi-users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wifi-users"] });
      toast({
        title: editingUser ? "User Updated" : "User Created",
        description: `WiFi user has been ${editingUser ? "updated" : "created"} successfully.`,
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save user",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/wifi-users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wifi-users"] });
      toast({
        title: "User Deleted",
        description: "WiFi user has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, data }: { id: string; action: string; data?: any }) => {
      return apiRequest("POST", `/api/wifi-users/${id}/${action}`, data || {});
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wifi-users"] });
      const actionLabels: Record<string, string> = {
        suspend: "User suspended",
        activate: "User activated",
        recharge: "Account recharged",
        "change-hotspot": "Hotspot changed",
      };
      toast({
        title: "Success",
        description: actionLabels[variables.action] || "Action completed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to perform action",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (user?: WifiUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        phoneNumber: user.phoneNumber,
        email: user.email || "",
        fullName: user.fullName || "",
        accountType: user.accountType,
        username: user.username || "",
        password: "",
        macAddress: user.macAddress || "",
        ipAddress: user.ipAddress || "",
        notes: user.notes || "",
        currentPlanId: user.currentPlanId || undefined,
        currentHotspotId: user.currentHotspotId || undefined,
        technicianId: user.technicianId || undefined,
      });
    } else {
      setEditingUser(null);
      setFormData({
        phoneNumber: "",
        email: "",
        fullName: "",
        accountType: "HOTSPOT",
        username: "",
        password: "",
        macAddress: "",
        ipAddress: "",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const filteredUsers = wifiUsers?.filter((user) => {
    const matchesSearch = 
      user.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAccountType = filterAccountType === "all" || user.accountType === filterAccountType;
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    
    return matchesSearch && matchesAccountType && matchesStatus;
  });

  const plansMap = new Map(plans?.map((p) => [p.id, p]) || []);
  const hotspotsMap = new Map(hotspots?.map((h) => [h.id, h]) || []);

  return (
    <div className="p-6 space-y-6" data-testid="wifi-users-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">WiFi Users</h1>
          <p className="text-muted-foreground">
            Manage customer accounts - Hotspot, PPPoE, and Static IP users
          </p>
        </div>
        <Button
          className="gradient-btn"
          onClick={() => handleOpenDialog()}
          data-testid="button-add-user"
        >
          <Plus size={18} className="mr-2" />
          Add User
        </Button>
      </div>

      <GlassPanel size="sm" className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search by phone, name, email, or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            data-testid="input-search-users"
          />
        </div>
        
        <Select value={filterAccountType} onValueChange={setFilterAccountType}>
          <SelectTrigger className="w-[150px] bg-white/5 border-white/10" data-testid="select-account-type">
            <SelectValue placeholder="Account Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="HOTSPOT">Hotspot</SelectItem>
            <SelectItem value="PPPOE">PPPoE</SelectItem>
            <SelectItem value="STATIC">Static IP</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] bg-white/5 border-white/10" data-testid="select-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
      </GlassPanel>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassPanel key={i} className="animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-1/4" />
                    <div className="h-3 bg-white/10 rounded w-1/3" />
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        ) : filteredUsers && filteredUsers.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <GlassPanel className="flex flex-col md:flex-row md:items-center gap-4 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                      <UserCircle size={28} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white truncate" data-testid={`text-user-name-${user.id}`}>
                          {user.fullName || user.phoneNumber}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", statusColors[user.status as keyof typeof statusColors])}
                          data-testid={`badge-status-${user.id}`}
                        >
                          {user.status}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30"
                        >
                          {accountTypeLabels[user.accountType as keyof typeof accountTypeLabels]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone size={14} />
                          {user.phoneNumber}
                        </span>
                        {user.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={14} />
                            {user.email}
                          </span>
                        )}
                        {user.currentPlanId && plansMap.get(user.currentPlanId) && (
                          <span className="flex items-center gap-1">
                            <Wifi size={14} />
                            {plansMap.get(user.currentPlanId)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    {user.expiryTime && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Expires: </span>
                        <span className={cn(
                          "font-medium",
                          new Date(user.expiryTime) < new Date() ? "text-red-400" : "text-white"
                        )}>
                          {format(new Date(user.expiryTime), "MMM d, yyyy HH:mm")}
                        </span>
                      </div>
                    )}
                    
                    {user.currentHotspotId && hotspotsMap.get(user.currentHotspotId) && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Router size={14} />
                        {hotspotsMap.get(user.currentHotspotId)?.locationName}
                      </div>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-user-actions-${user.id}`}>
                          <MoreVertical size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/wifi-users/${user.id}`} className="flex items-center cursor-pointer">
                            <Eye size={16} className="mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDialog(user)}>
                          <UserCircle size={16} className="mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => actionMutation.mutate({ id: user.id, action: "recharge" })}
                        >
                          <RefreshCw size={16} className="mr-2" />
                          Quick Recharge
                        </DropdownMenuItem>
                        {user.status === "ACTIVE" ? (
                          <DropdownMenuItem 
                            onClick={() => actionMutation.mutate({ id: user.id, action: "suspend" })}
                            className="text-amber-400"
                          >
                            <Ban size={16} className="mr-2" />
                            Suspend Account
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => actionMutation.mutate({ id: user.id, action: "activate" })}
                            className="text-emerald-400"
                          >
                            <Play size={16} className="mr-2" />
                            Activate Account
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this user?")) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                          className="text-destructive"
                        >
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </GlassPanel>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <GlassPanel className="text-center py-12">
            <Users size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterAccountType !== "all" || filterStatus !== "all"
                ? "No users match your search criteria"
                : "No WiFi users yet"}
            </p>
            {!searchQuery && filterAccountType === "all" && filterStatus === "all" && (
              <Button
                className="gradient-btn"
                onClick={() => handleOpenDialog()}
                data-testid="button-create-first-user"
              >
                Add Your First User
              </Button>
            )}
          </GlassPanel>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-panel border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingUser ? "Edit WiFi User" : "Add New WiFi User"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassInput
              label="Phone Number"
              placeholder="e.g., 254712345678"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              required
              icon={<Phone size={16} />}
              data-testid="input-phone"
            />

            <GlassInput
              label="Full Name"
              placeholder="Customer name"
              value={formData.fullName || ""}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              icon={<UserCircle size={16} />}
              data-testid="input-fullname"
            />

            <GlassInput
              label="Email"
              type="email"
              placeholder="customer@example.com"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={<Mail size={16} />}
              data-testid="input-email"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Account Type
              </label>
              <div className="flex gap-2">
                {(["HOTSPOT", "PPPOE", "STATIC"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, accountType: type })}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      formData.accountType === type
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
                    )}
                    data-testid={`button-account-type-${type}`}
                  >
                    {accountTypeLabels[type]}
                  </button>
                ))}
              </div>
            </div>

            {(formData.accountType === "PPPOE" || formData.accountType === "STATIC") && (
              <div className="grid grid-cols-2 gap-4">
                <GlassInput
                  label="Username"
                  placeholder="PPPoE/Login username"
                  value={formData.username || ""}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  data-testid="input-username"
                />
                <GlassInput
                  label="Password"
                  type="password"
                  placeholder="Account password"
                  value={formData.password || ""}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  data-testid="input-password"
                />
              </div>
            )}

            {formData.accountType === "STATIC" && (
              <GlassInput
                label="Static IP Address"
                placeholder="e.g., 192.168.1.100"
                value={formData.ipAddress || ""}
                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                data-testid="input-ip"
              />
            )}

            <GlassInput
              label="MAC Address"
              placeholder="e.g., AA:BB:CC:DD:EE:FF"
              value={formData.macAddress || ""}
              onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
              data-testid="input-mac"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Assigned Plan
              </label>
              <Select 
                value={formData.currentPlanId || ""} 
                onValueChange={(value) => setFormData({ ...formData, currentPlanId: value || undefined })}
              >
                <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-plan">
                  <SelectValue placeholder="Select a plan (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - KES {plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Assigned Hotspot
              </label>
              <Select 
                value={formData.currentHotspotId || ""} 
                onValueChange={(value) => setFormData({ ...formData, currentHotspotId: value || undefined })}
              >
                <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-hotspot">
                  <SelectValue placeholder="Select a hotspot (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {hotspots?.map((hotspot) => (
                    <SelectItem key={hotspot.id} value={hotspot.id}>
                      {hotspot.locationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Assigned Technician
              </label>
              <Select 
                value={formData.technicianId || ""} 
                onValueChange={(value) => setFormData({ ...formData, technicianId: value || undefined })}
              >
                <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-technician">
                  <SelectValue placeholder="Select a technician (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {technicians?.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.username} {tech.email ? `(${tech.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <GlassTextarea
              label="Notes"
              placeholder="Additional notes about this user"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="input-notes"
            />

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
                data-testid="button-save-user"
              >
                {saveMutation.isPending ? "Saving..." : editingUser ? "Update User" : "Add User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
