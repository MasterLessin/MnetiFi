import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  UserPlus,
  Users,
  Shield,
  ShieldCheck,
  Wrench,
  MoreVertical,
  Trash2,
  Power,
  PowerOff,
  Mail,
  Calendar,
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  isActive: boolean;
  tenantId: string | null;
  createdAt: string;
  tenantName?: string;
}

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["superadmin", "admin", "tech"]),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function SuperAdminUsersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "superadmin",
    },
  });

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/superadmin/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      return apiRequest("POST", "/api/superadmin/create-superadmin", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "User Created",
        description: "The admin user has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/superadmin/users/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      toast({
        title: "User Updated",
        description: "The user status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/superadmin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      toast({
        title: "User Deleted",
        description: "The user has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "superadmin":
        return <ShieldCheck size={16} className="text-pink-400" />;
      case "admin":
        return <Shield size={16} className="text-cyan-400" />;
      case "tech":
        return <Wrench size={16} className="text-amber-400" />;
      default:
        return <Users size={16} />;
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { bg: string; text: string; label: string }> = {
      superadmin: { bg: "bg-pink-500/20", text: "text-pink-400", label: "Super Admin" },
      admin: { bg: "bg-cyan-500/20", text: "text-cyan-400", label: "Admin" },
      tech: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Technician" },
    };
    const config = roleConfig[role] || roleConfig.admin;
    return (
      <Badge variant="outline" className={`${config.bg} ${config.text} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const onSubmit = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6" data-testid="superadmin-users-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-muted-foreground">
            Create and manage platform administrators and sub-admins.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <UserPlus size={16} className="mr-2" />
              Create Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Admin User</DialogTitle>
              <DialogDescription>
                Add a new administrator or technician to the platform.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="johndoe"
                          {...field}
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Minimum 6 characters"
                          {...field}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="superadmin">
                            <div className="flex items-center gap-2">
                              <ShieldCheck size={14} className="text-pink-400" />
                              Super Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield size={14} className="text-cyan-400" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="tech">
                            <div className="flex items-center gap-2">
                              <Wrench size={14} className="text-amber-400" />
                              Technician
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Super Admins can manage the entire platform. Admins manage their tenant. Technicians have limited access.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <GlassPanel size="md">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-white/5">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-1/4" />
                  <div className="h-3 bg-white/10 rounded w-1/6" />
                </div>
                <div className="h-6 w-20 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-3">
            {users.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  user.isActive
                    ? "bg-white/5 border-white/10"
                    : "bg-red-500/5 border-red-500/20"
                }`}
                data-testid={`user-row-${user.id}`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                  {getRoleIcon(user.role)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white">{user.username}</p>
                    {getRoleBadge(user.role)}
                    {!user.isActive && (
                      <Badge variant="outline" className="bg-red-500/20 text-red-400 border-0">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  {user.email && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail size={12} />
                      <span>{user.email}</span>
                    </div>
                  )}
                </div>

                <div className="hidden md:flex items-center gap-4">
                  {user.tenantName && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Tenant</p>
                      <p className="text-sm text-white">{user.tenantName}</p>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar size={14} />
                      <span className="text-xs">Created</span>
                    </div>
                    <p className="text-sm text-white">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`button-user-actions-${user.id}`}
                    >
                      <MoreVertical size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.isActive ? (
                      <DropdownMenuItem
                        onClick={() =>
                          toggleUserMutation.mutate({ id: user.id, isActive: false })
                        }
                        data-testid={`action-disable-${user.id}`}
                      >
                        <PowerOff size={16} className="mr-2 text-amber-400" />
                        Disable User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() =>
                          toggleUserMutation.mutate({ id: user.id, isActive: true })
                        }
                        data-testid={`action-enable-${user.id}`}
                      >
                        <Power size={16} className="mr-2 text-cyan-400" />
                        Enable User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteUserMutation.mutate(user.id)}
                      className="text-red-400 focus:text-red-400"
                      data-testid={`action-delete-${user.id}`}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No admin users found</p>
            <p className="text-sm mt-1">Create your first admin user to get started</p>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
