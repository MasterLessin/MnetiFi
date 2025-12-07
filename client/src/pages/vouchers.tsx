import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Ticket, Copy, Check, Search, Filter, Printer } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Plan, Voucher, VoucherBatch } from "@shared/schema";

function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 86400)} days`;
}

function formatDate(date: string | Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function VoucherBatchCard({ batch, plans, onViewVouchers }: { 
  batch: VoucherBatch; 
  plans: Plan[];
  onViewVouchers: (batchId: string) => void;
}) {
  const plan = plans.find(p => p.id === batch.planId);
  const usedPercentage = batch.quantity > 0 ? (batch.usedCount / batch.quantity) * 100 : 0;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <GlassPanel className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground" data-testid={`batch-name-${batch.id}`}>{batch.name}</h3>
              <p className="text-xs text-muted-foreground">{batch.prefix ? `Prefix: ${batch.prefix}` : "No prefix"}</p>
            </div>
          </div>
          <Badge variant={usedPercentage === 100 ? "secondary" : "default"} className="text-xs">
            {batch.usedCount}/{batch.quantity} used
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Plan:</span>
            <span className="font-medium">{plan?.name || "Unknown"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-medium">{plan ? formatDuration(plan.durationSeconds) : "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valid Until:</span>
            <span className="font-medium">{formatDate(batch.validUntil)}</span>
          </div>
        </div>

        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all" 
            style={{ width: `${usedPercentage}%` }}
          />
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onViewVouchers(batch.id)}
          data-testid={`button-view-vouchers-${batch.id}`}
        >
          View Vouchers
        </Button>
      </GlassPanel>
    </motion.div>
  );
}

function VoucherRow({ voucher, plan, onCopy }: { 
  voucher: Voucher; 
  plan?: Plan;
  onCopy: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    onCopy(voucher.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-green-500/20 text-green-400",
    USED: "bg-gray-500/20 text-gray-400",
    EXPIRED: "bg-red-500/20 text-red-400",
    DISABLED: "bg-yellow-500/20 text-yellow-400",
  };
  
  return (
    <TableRow>
      <TableCell className="font-mono font-semibold" data-testid={`voucher-code-${voucher.id}`}>
        {voucher.code}
      </TableCell>
      <TableCell>
        <Badge className={statusColors[voucher.status] || ""}>
          {voucher.status}
        </Badge>
      </TableCell>
      <TableCell>{plan?.name || "-"}</TableCell>
      <TableCell>{formatDate(voucher.usedAt)}</TableCell>
      <TableCell>{formatDate(voucher.expiresAt)}</TableCell>
      <TableCell>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleCopy}
          data-testid={`button-copy-${voucher.id}`}
        >
          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function VouchersPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVoucherListOpen, setIsVoucherListOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    planId: "",
    quantity: 10,
    prefix: "",
    validUntil: "",
  });

  const { data: batches, isLoading: batchesLoading } = useQuery<VoucherBatch[]>({
    queryKey: ["/api/voucher-batches"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: batchVouchers } = useQuery<Voucher[]>({
    queryKey: ["/api/voucher-batches", selectedBatchId, "vouchers"],
    queryFn: async () => {
      if (!selectedBatchId) return [];
      const res = await fetch(`/api/voucher-batches/${selectedBatchId}/vouchers`);
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      return res.json();
    },
    enabled: !!selectedBatchId,
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/voucher-batches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voucher-batches"] });
      toast({
        title: "Vouchers Created",
        description: `Successfully created ${formData.quantity} vouchers.`,
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create vouchers",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = () => {
    setFormData({
      name: "",
      planId: "",
      quantity: 10,
      prefix: "",
      validUntil: "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({
      name: "",
      planId: "",
      quantity: 10,
      prefix: "",
      validUntil: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.planId || formData.quantity < 1) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createBatchMutation.mutate(formData);
  };

  const handleViewVouchers = (batchId: string) => {
    setSelectedBatchId(batchId);
    setIsVoucherListOpen(true);
  };

  const handleCloseVoucherList = () => {
    setIsVoucherListOpen(false);
    setSelectedBatchId(null);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: `Voucher code ${code} copied to clipboard`,
    });
  };

  const handlePrintVouchers = () => {
    if (!batchVouchers || !selectedBatchId) return;
    const batch = batches?.find(b => b.id === selectedBatchId);
    const plan = plans?.find(p => p.id === batch?.planId);
    
    const printContent = batchVouchers
      .filter(v => v.status === "AVAILABLE")
      .map(v => `Code: ${v.code} | Plan: ${plan?.name || "N/A"}`)
      .join("\n");
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Voucher Codes - ${batch?.name}</title></head>
          <body style="font-family: monospace; padding: 20px;">
            <h2>${batch?.name} - Voucher Codes</h2>
            <pre>${printContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredVouchers = batchVouchers?.filter(v => {
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (searchQuery && !v.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const quantityPresets = [10, 25, 50, 100, 200, 500];

  return (
    <div className="p-6 space-y-6" data-testid="vouchers-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vouchers</h1>
          <p className="text-muted-foreground">
            Generate and manage WiFi access codes
          </p>
        </div>
        <Button
          className="gradient-btn"
          onClick={handleOpenDialog}
          data-testid="button-create-batch"
        >
          <Plus size={18} className="mr-2" />
          Generate Vouchers
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {batchesLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <GlassPanel key={i} className="p-4 h-48 animate-pulse">
              <div className="h-full bg-muted/20 rounded-lg" />
            </GlassPanel>
          ))
        ) : batches && batches.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {batches.map(batch => (
              <VoucherBatchCard 
                key={batch.id} 
                batch={batch} 
                plans={plans || []}
                onViewVouchers={handleViewVouchers}
              />
            ))}
          </AnimatePresence>
        ) : (
          <GlassPanel className="col-span-full p-12 text-center">
            <Ticket size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No vouchers yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first batch of WiFi access vouchers
            </p>
            <Button onClick={handleOpenDialog} data-testid="button-create-first-batch">
              <Plus size={18} className="mr-2" />
              Generate Vouchers
            </Button>
          </GlassPanel>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Vouchers</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Batch Name</label>
              <GlassInput
                placeholder="e.g., Weekend Promo, School Term 1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-batch-name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Plan</label>
              <Select
                value={formData.planId}
                onValueChange={(value) => setFormData({ ...formData, planId: value })}
              >
                <SelectTrigger data-testid="select-plan">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - KES {plan.price} ({formatDuration(plan.durationSeconds)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {quantityPresets.map(qty => (
                  <Button
                    key={qty}
                    type="button"
                    variant={formData.quantity === qty ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, quantity: qty })}
                    data-testid={`button-qty-${qty}`}
                  >
                    {qty}
                  </Button>
                ))}
              </div>
              <GlassInput
                type="number"
                min="1"
                max="1000"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                data-testid="input-quantity"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Code Prefix (Optional)</label>
              <GlassInput
                placeholder="e.g., WIFI, PROMO"
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                maxLength={6}
                data-testid="input-prefix"
              />
              <p className="text-xs text-muted-foreground">Vouchers will look like: {formData.prefix || "ABC"}-XXXXXXXX</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Valid Until (Optional)</label>
              <GlassInput
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                data-testid="input-valid-until"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 gradient-btn" 
                disabled={createBatchMutation.isPending}
                data-testid="button-submit-batch"
              >
                {createBatchMutation.isPending ? "Creating..." : "Generate Vouchers"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isVoucherListOpen} onOpenChange={setIsVoucherListOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
              <span>Voucher Codes</span>
              <Button variant="outline" size="sm" onClick={handlePrintVouchers} data-testid="button-print">
                <Printer size={16} className="mr-2" />
                Print Available
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <GlassInput
                  placeholder="Search codes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-vouchers"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <Filter size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="USED">Used</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Used At</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers?.map(voucher => {
                  const plan = plans?.find(p => p.id === voucher.planId);
                  return (
                    <VoucherRow 
                      key={voucher.id} 
                      voucher={voucher} 
                      plan={plan}
                      onCopy={handleCopyCode}
                    />
                  );
                })}
              </TableBody>
            </Table>
            {filteredVouchers?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No vouchers found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
