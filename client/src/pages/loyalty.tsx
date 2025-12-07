import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Star, Plus, Minus, Search, User, TrendingUp, Gift, History } from "lucide-react";
import { format } from "date-fns";
import type { WifiUser, LoyaltyPoints, LoyaltyTransaction } from "@shared/schema";

export default function LoyaltyPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<WifiUser | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState("");
  const [addReason, setAddReason] = useState("");
  const [redeemReason, setRedeemReason] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);

  const { data: wifiUsers, isLoading: loadingUsers } = useQuery<WifiUser[]>({
    queryKey: ["/api/wifi-users"],
  });

  const { data: loyaltyData, isLoading: loadingLoyalty } = useQuery<LoyaltyPoints>({
    queryKey: ["/api/loyalty", selectedUser?.id],
    enabled: !!selectedUser?.id,
  });

  const { data: transactions, isLoading: loadingTransactions } = useQuery<LoyaltyTransaction[]>({
    queryKey: ["/api/loyalty", selectedUser?.id, "transactions"],
    enabled: !!selectedUser?.id,
  });

  const addPointsMutation = useMutation({
    mutationFn: async ({ points, reason }: { points: number; reason: string }) => {
      return apiRequest("POST", `/api/loyalty/${selectedUser?.id}/add`, { points, reason });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Points added successfully" });
      setPointsToAdd("");
      setAddReason("");
      setAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty", selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty", selectedUser?.id, "transactions"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add points", variant: "destructive" });
    },
  });

  const redeemPointsMutation = useMutation({
    mutationFn: async ({ points, reason }: { points: number; reason: string }) => {
      return apiRequest("POST", `/api/loyalty/${selectedUser?.id}/redeem`, { points, reason });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Points redeemed successfully" });
      setPointsToRedeem("");
      setRedeemReason("");
      setRedeemDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty", selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty", selectedUser?.id, "transactions"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to redeem points", variant: "destructive" });
    },
  });

  const filteredUsers = wifiUsers?.filter(user =>
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phoneNumber?.includes(searchQuery)
  ) || [];

  const handleAddPoints = () => {
    const points = parseInt(pointsToAdd);
    if (isNaN(points) || points <= 0) {
      toast({ title: "Error", description: "Please enter a valid number of points", variant: "destructive" });
      return;
    }
    addPointsMutation.mutate({ points, reason: addReason || "Manual addition" });
  };

  const handleRedeemPoints = () => {
    const points = parseInt(pointsToRedeem);
    if (isNaN(points) || points <= 0) {
      toast({ title: "Error", description: "Please enter a valid number of points", variant: "destructive" });
      return;
    }
    if (points > (loyaltyData?.points || 0)) {
      toast({ title: "Error", description: "Insufficient points balance", variant: "destructive" });
      return;
    }
    redeemPointsMutation.mutate({ points, reason: redeemReason || "Manual redemption" });
  };

  return (
    <div className="flex h-full gap-4 p-4">
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5" />
            Customers
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-loyalty"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {loadingUsers ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full p-3 rounded-md text-left transition-colors ${
                        isSelected
                          ? "bg-primary/10 border border-primary/20"
                          : "hover-elevate"
                      }`}
                      data-testid={`loyalty-user-${user.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate text-sm">
                            {user.fullName || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.phoneNumber}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No customers found
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex-1 flex flex-col gap-4">
        {selectedUser ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Current Balance</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-500" />
                    {loadingLoyalty ? <Skeleton className="h-9 w-20" /> : loyaltyData?.points || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Earned</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                    {loadingLoyalty ? <Skeleton className="h-9 w-20" /> : loyaltyData?.totalEarned || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Redeemed</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    <Gift className="h-6 w-6 text-purple-500" />
                    {loadingLoyalty ? <Skeleton className="h-9 w-20" /> : loyaltyData?.totalRedeemed || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card className="flex-1">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedUser.fullName || "Customer"}
                  </CardTitle>
                  <CardDescription>{selectedUser.phoneNumber}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-add-points">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Points
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Loyalty Points</DialogTitle>
                        <DialogDescription>
                          Add points to {selectedUser.fullName || "this customer"}'s account
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <label className="text-sm font-medium">Points to Add</label>
                          <Input
                            type="number"
                            placeholder="Enter points"
                            value={pointsToAdd}
                            onChange={(e) => setPointsToAdd(e.target.value)}
                            data-testid="input-add-points"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Reason (optional)</label>
                          <Input
                            placeholder="e.g., Referral bonus, Promotion"
                            value={addReason}
                            onChange={(e) => setAddReason(e.target.value)}
                            data-testid="input-add-reason"
                          />
                        </div>
                        <Button
                          onClick={handleAddPoints}
                          disabled={addPointsMutation.isPending}
                          className="w-full"
                          data-testid="button-confirm-add"
                        >
                          {addPointsMutation.isPending ? "Adding..." : "Add Points"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-redeem-points">
                        <Minus className="h-4 w-4 mr-2" />
                        Redeem Points
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Redeem Loyalty Points</DialogTitle>
                        <DialogDescription>
                          Redeem points from {selectedUser.fullName || "this customer"}'s account.
                          Current balance: {loyaltyData?.points || 0} points
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <label className="text-sm font-medium">Points to Redeem</label>
                          <Input
                            type="number"
                            placeholder="Enter points"
                            value={pointsToRedeem}
                            onChange={(e) => setPointsToRedeem(e.target.value)}
                            max={loyaltyData?.points || 0}
                            data-testid="input-redeem-points"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Reason (optional)</label>
                          <Input
                            placeholder="e.g., Free day pass, Discount applied"
                            value={redeemReason}
                            onChange={(e) => setRedeemReason(e.target.value)}
                            data-testid="input-redeem-reason"
                          />
                        </div>
                        <Button
                          onClick={handleRedeemPoints}
                          disabled={redeemPointsMutation.isPending}
                          className="w-full"
                          data-testid="button-confirm-redeem"
                        >
                          {redeemPointsMutation.isPending ? "Redeeming..." : "Redeem Points"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-5 w-5" />
                  <h3 className="font-medium">Transaction History</h3>
                </div>
                {loadingTransactions ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm">
                            {tx.createdAt && format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.type === "earn" ? "default" : "secondary"}>
                              {tx.type === "earn" ? "Earned" : "Redeemed"}
                            </Badge>
                          </TableCell>
                          <TableCell className={tx.type === "earn" ? "text-green-500" : "text-red-500"}>
                            {tx.type === "earn" ? "+" : "-"}{tx.points}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {tx.description || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Star className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Select a customer</h3>
              <p className="text-sm">Choose a customer to view and manage their loyalty points</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
