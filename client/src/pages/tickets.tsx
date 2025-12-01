import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Ticket,
  Clock,
  Search,
  MoreVertical,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  User,
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
import type { Ticket as TicketType, InsertTicket, WifiUser } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

const statusLabels = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const statusColors = {
  OPEN: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  RESOLVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const priorityLabels = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const priorityColors = {
  LOW: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  MEDIUM: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  HIGH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  URGENT: "bg-red-500/20 text-red-400 border-red-500/30",
};

const priorityIcons = {
  LOW: AlertCircle,
  MEDIUM: AlertCircle,
  HIGH: AlertTriangle,
  URGENT: AlertTriangle,
};

export default function TicketsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [closingTicket, setClosingTicket] = useState<TicketType | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const [formData, setFormData] = useState<Partial<InsertTicket>>({
    subject: "",
    issueDetails: "",
    priority: "MEDIUM",
    wifiUserId: "",
  });

  const { data: ticketsList, isLoading } = useQuery<TicketType[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: wifiUsers } = useQuery<WifiUser[]>({
    queryKey: ["/api/wifi-users"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<InsertTicket>) => {
      if (editingTicket) {
        return apiRequest("PATCH", `/api/tickets/${editingTicket.id}`, data);
      }
      return apiRequest("POST", "/api/tickets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: editingTicket ? "Ticket Updated" : "Ticket Created",
        description: `Ticket has been ${editingTicket ? "updated" : "created"} successfully.`,
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save ticket",
        variant: "destructive",
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async ({ id, resolutionNotes }: { id: string; resolutionNotes: string }) => {
      return apiRequest("POST", `/api/tickets/${id}/close`, { resolutionNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Ticket Closed",
        description: "Ticket has been closed successfully.",
      });
      setIsCloseDialogOpen(false);
      setClosingTicket(null);
      setResolutionNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close ticket",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/tickets/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Status Updated",
        description: "Ticket status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (ticket?: TicketType) => {
    if (ticket) {
      setEditingTicket(ticket);
      setFormData({
        subject: ticket.subject,
        issueDetails: ticket.issueDetails,
        priority: ticket.priority,
        wifiUserId: ticket.wifiUserId || "",
      });
    } else {
      setEditingTicket(null);
      setFormData({
        subject: "",
        issueDetails: "",
        priority: "MEDIUM",
        wifiUserId: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTicket(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      wifiUserId: formData.wifiUserId || null,
    };
    saveMutation.mutate(dataToSubmit);
  };

  const handleOpenCloseDialog = (ticket: TicketType) => {
    setClosingTicket(ticket);
    setResolutionNotes(ticket.resolutionNotes || "");
    setIsCloseDialogOpen(true);
  };

  const filteredTickets = ticketsList?.filter((ticket) => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.issueDetails.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || ticket.status === filterStatus;
    const matchesPriority = filterPriority === "all" || ticket.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const wifiUsersMap = new Map(wifiUsers?.map((u) => [u.id, u]) || []);

  return (
    <div className="p-6 space-y-6" data-testid="tickets-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
          <p className="text-muted-foreground">
            Track and manage customer support requests
          </p>
        </div>
        <Button
          className="gradient-btn"
          onClick={() => handleOpenDialog()}
          data-testid="button-add-ticket"
        >
          <Plus size={18} className="mr-2" />
          New Ticket
        </Button>
      </div>

      <GlassPanel size="sm" className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            data-testid="input-search-tickets"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] bg-white/5 border-white/10" data-testid="select-ticket-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px] bg-white/5 border-white/10" data-testid="select-ticket-priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </GlassPanel>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassPanel key={i} className="animate-pulse">
                <div className="space-y-3">
                  <div className="h-5 bg-white/10 rounded w-1/3" />
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                </div>
              </GlassPanel>
            ))}
          </div>
        ) : filteredTickets && filteredTickets.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredTickets.map((ticket) => {
              const PriorityIcon = priorityIcons[ticket.priority as keyof typeof priorityIcons];
              const wifiUser = ticket.wifiUserId ? wifiUsersMap.get(ticket.wifiUserId) : null;
              
              return (
                <motion.div
                  key={ticket.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <GlassPanel className="hover:bg-white/[0.03] transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-semibold text-white" data-testid={`text-ticket-subject-${ticket.id}`}>
                            {ticket.subject}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", statusColors[ticket.status as keyof typeof statusColors])}
                          >
                            {statusLabels[ticket.status as keyof typeof statusLabels]}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs flex items-center gap-1", priorityColors[ticket.priority as keyof typeof priorityColors])}
                          >
                            <PriorityIcon size={12} />
                            {priorityLabels[ticket.priority as keyof typeof priorityLabels]}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {ticket.issueDetails}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {wifiUser && (
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {wifiUser.fullName || wifiUser.phoneNumber}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Created {formatDistanceToNow(new Date(ticket.createdAt!), { addSuffix: true })}
                          </span>
                          {ticket.closedAt && (
                            <span className="flex items-center gap-1">
                              <CheckCircle size={12} />
                              Closed {formatDistanceToNow(new Date(ticket.closedAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        
                        {ticket.resolutionNotes && (
                          <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-xs text-muted-foreground mb-1">Resolution Notes:</p>
                            <p className="text-sm text-white">{ticket.resolutionNotes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ticket.status !== "CLOSED" && (
                          <Select 
                            value={ticket.status} 
                            onValueChange={(status) => updateStatusMutation.mutate({ id: ticket.id, status })}
                          >
                            <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-xs h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OPEN">Open</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="RESOLVED">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-ticket-actions-${ticket.id}`}>
                              <MoreVertical size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleOpenDialog(ticket)}>
                              <MessageSquare size={16} className="mr-2" />
                              Edit Ticket
                            </DropdownMenuItem>
                            {ticket.status !== "CLOSED" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleOpenCloseDialog(ticket)}
                                  className="text-emerald-400"
                                >
                                  <CheckCircle size={16} className="mr-2" />
                                  Close Ticket
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </GlassPanel>
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <GlassPanel className="text-center py-12">
            <Ticket size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterStatus !== "all" || filterPriority !== "all"
                ? "No tickets match your search criteria"
                : "No support tickets yet"}
            </p>
            {!searchQuery && filterStatus === "all" && filterPriority === "all" && (
              <Button
                className="gradient-btn"
                onClick={() => handleOpenDialog()}
                data-testid="button-create-first-ticket"
              >
                Create Your First Ticket
              </Button>
            )}
          </GlassPanel>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-panel border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingTicket ? "Edit Ticket" : "Create New Ticket"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassInput
              label="Subject"
              placeholder="Brief description of the issue"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              data-testid="input-ticket-subject"
            />

            <GlassTextarea
              label="Issue Details"
              placeholder="Describe the issue in detail..."
              value={formData.issueDetails || ""}
              onChange={(e) => setFormData({ ...formData, issueDetails: e.target.value })}
              required
              data-testid="input-ticket-details"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Priority
              </label>
              <div className="flex gap-2">
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority })}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      formData.priority === priority
                        ? priorityColors[priority]
                        : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
                    )}
                    data-testid={`button-priority-${priority}`}
                  >
                    {priorityLabels[priority]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Related Customer (Optional)
              </label>
              <Select 
                value={formData.wifiUserId || ""} 
                onValueChange={(value) => setFormData({ ...formData, wifiUserId: value || undefined })}
              >
                <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-ticket-user">
                  <SelectValue placeholder="Select a customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {wifiUsers?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName || user.phoneNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCloseDialog}
                className="flex-1"
                data-testid="button-cancel-ticket"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 gradient-btn"
                disabled={saveMutation.isPending}
                data-testid="button-save-ticket"
              >
                {saveMutation.isPending ? "Saving..." : editingTicket ? "Update Ticket" : "Create Ticket"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent className="glass-panel border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Close Ticket
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              You are about to close ticket: <strong className="text-white">{closingTicket?.subject}</strong>
            </p>

            <GlassTextarea
              label="Resolution Notes"
              placeholder="Describe how the issue was resolved..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              data-testid="input-resolution-notes"
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCloseDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => closingTicket && closeMutation.mutate({ 
                  id: closingTicket.id, 
                  resolutionNotes 
                })}
                className="flex-1 gradient-btn"
                disabled={closeMutation.isPending}
                data-testid="button-confirm-close"
              >
                {closeMutation.isPending ? "Closing..." : "Close Ticket"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
