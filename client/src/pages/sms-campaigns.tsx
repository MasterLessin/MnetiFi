import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  MessageSquare, 
  Send, 
  Users, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileText,
  History,
  Plus
} from "lucide-react";
import type { WifiUser } from "@shared/schema";

interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
}

interface SmsCampaign {
  id: string;
  name: string;
  message: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: "pending" | "sending" | "completed" | "failed";
  createdAt: string;
}

const defaultTemplates: SmsTemplate[] = [
  {
    id: "welcome",
    name: "Welcome Message",
    content: "Welcome to {isp_name} WiFi! Your account is now active. Enjoy fast and reliable internet. Need help? Call {support_phone}.",
    category: "onboarding",
  },
  {
    id: "expiry_reminder",
    name: "Expiry Reminder",
    content: "Hi {customer_name}, your WiFi plan expires in {hours} hours. Recharge now to stay connected! Visit our portal or dial *123#.",
    category: "reminder",
  },
  {
    id: "payment_confirm",
    name: "Payment Confirmation",
    content: "Payment of Ksh {amount} received! Your {plan_name} plan is now active until {expiry_date}. Receipt: {receipt}",
    category: "payment",
  },
  {
    id: "maintenance",
    name: "Maintenance Notice",
    content: "Scheduled maintenance on {date} from {start_time} to {end_time}. Service may be temporarily unavailable. We apologize for any inconvenience.",
    category: "announcement",
  },
  {
    id: "promo",
    name: "Promotional Offer",
    content: "Special offer! Get {discount}% off on our {plan_name} plan. Use code {promo_code} before {expiry_date}. Limited time only!",
    category: "marketing",
  },
  {
    id: "reactivation",
    name: "Reactivation",
    content: "We miss you! Your WiFi account has been inactive. Recharge now and get {bonus} bonus data. Visit our portal to reconnect.",
    category: "marketing",
  },
];

export default function SmsCampaignsPage() {
  const { toast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAccountType, setFilterAccountType] = useState<string>("all");
  const [selectAll, setSelectAll] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useQuery<WifiUser[]>({
    queryKey: ["/api/wifi-users"],
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<SmsCampaign[]>({
    queryKey: ["/api/sms/campaigns"],
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (data: { name: string; message: string; recipients: string[] }) => {
      return apiRequest("POST", "/api/sms/campaigns", data);
    },
    onSuccess: () => {
      toast({
        title: "Campaign Started",
        description: "Your SMS campaign is being sent to recipients.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/campaigns"] });
      setSelectedUsers([]);
      setMessage("");
      setCampaignName("");
      setSelectAll(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter((user) => {
    if (filterStatus !== "all" && user.status !== filterStatus) return false;
    if (filterAccountType !== "all" && user.accountType !== filterAccountType) return false;
    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
      setSelectAll(false);
    }
  };

  const handleTemplateSelect = (template: SmsTemplate) => {
    setMessage(template.content);
    setShowTemplateDialog(false);
  };

  const handleSendCampaign = () => {
    if (!campaignName.trim()) {
      toast({
        title: "Campaign Name Required",
        description: "Please enter a name for this campaign.",
        variant: "destructive",
      });
      return;
    }
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send.",
        variant: "destructive",
      });
      return;
    }
    if (selectedUsers.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please select at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    sendCampaignMutation.mutate({
      name: campaignName,
      message,
      recipients: selectedUsers,
    });
  };

  const characterCount = message.length;
  const smsCount = Math.ceil(characterCount / 160) || 1;
  const estimatedCost = selectedUsers.length * smsCount * 0.7; // 0.70 KES per SMS

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            SMS Campaigns
          </h1>
          <p className="text-muted-foreground">
            Send bulk SMS messages to your customers
          </p>
        </div>
        <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">
          <MessageSquare className="w-3 h-3 mr-1" />
          Premium Feature
        </Badge>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="compose" data-testid="tab-compose">
            <Send className="w-4 h-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recipient Selection */}
            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Select Recipients
                </CardTitle>
                <CardDescription>
                  Choose customers to receive your message
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[140px] bg-white/5 border-white/10" data-testid="select-status-filter">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="EXPIRED">Expired</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={filterAccountType} onValueChange={setFilterAccountType}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10" data-testid="select-type-filter">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="HOTSPOT">Hotspot</SelectItem>
                      <SelectItem value="PPPOE">PPPoE</SelectItem>
                      <SelectItem value="STATIC">Static</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Select All */}
                <div className="flex items-center gap-2 p-3 bg-white/5 rounded-md">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={(checked) => handleSelectAll(checked === true)}
                    data-testid="checkbox-select-all"
                  />
                  <Label htmlFor="select-all" className="text-sm cursor-pointer">
                    Select All ({filteredUsers.length} customers)
                  </Label>
                </div>

                {/* User List */}
                <ScrollArea className="h-[300px] rounded-md border border-white/10">
                  {usersLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                      <Users className="w-8 h-8 mb-2" />
                      <p>No customers found</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                          data-testid={`user-row-${user.id}`}
                        >
                          <Checkbox
                            id={user.id}
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => handleUserSelect(user.id, checked === true)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.fullName || user.phoneNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.phoneNumber}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {user.accountType}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedUsers.length} of {filteredUsers.length} selected
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Message Composition */}
            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  Compose Message
                </CardTitle>
                <CardDescription>
                  Write your message or use a template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    placeholder="e.g., December Promotion"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="bg-white/5 border-white/10"
                    data-testid="input-campaign-name"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message">Message</Label>
                    <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" data-testid="button-use-template">
                          <FileText className="w-4 h-4 mr-1" />
                          Use Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>SMS Templates</DialogTitle>
                          <DialogDescription>
                            Select a template to start with
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                          {defaultTemplates.map((template) => (
                            <div
                              key={template.id}
                              className="p-4 rounded-lg border border-white/10 hover-elevate cursor-pointer"
                              onClick={() => handleTemplateSelect(template)}
                              data-testid={`template-${template.id}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{template.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {template.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {template.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[150px] bg-white/5 border-white/10"
                    data-testid="textarea-message"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{characterCount} characters</span>
                    <span>{smsCount} SMS ({smsCount > 1 ? "multipart" : "single"})</span>
                  </div>
                </div>

                {/* Cost Estimate */}
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium mb-3">Cost Estimate</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recipients</span>
                        <span>{selectedUsers.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SMS per recipient</span>
                        <span>{smsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total SMS</span>
                        <span>{selectedUsers.length * smsCount}</span>
                      </div>
                      <div className="border-t border-white/10 pt-2 flex justify-between font-medium">
                        <span>Estimated Cost</span>
                        <span className="text-cyan-400">Ksh {estimatedCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  className="w-full"
                  onClick={handleSendCampaign}
                  disabled={sendCampaignMutation.isPending || selectedUsers.length === 0 || !message.trim()}
                  data-testid="button-send-campaign"
                >
                  {sendCampaignMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send to {selectedUsers.length} Recipients
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <CardTitle>Campaign History</CardTitle>
              <CardDescription>View past SMS campaigns and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                  <History className="w-12 h-12 mb-3" />
                  <p className="text-lg font-medium">No campaigns yet</p>
                  <p className="text-sm">Send your first campaign to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="p-4 rounded-lg border border-white/10 hover-elevate"
                      data-testid={`campaign-${campaign.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{campaign.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {campaign.message}
                          </p>
                        </div>
                        <Badge
                          variant={
                            campaign.status === "completed"
                              ? "default"
                              : campaign.status === "failed"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {campaign.status === "sending" && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          {campaign.status === "completed" && (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          )}
                          {campaign.status === "failed" && (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {campaign.recipientCount} recipients
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          {campaign.sentCount} sent
                        </span>
                        {campaign.failedCount > 0 && (
                          <span className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-400" />
                            {campaign.failedCount} failed
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="bg-card/50 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Message Templates</CardTitle>
                <CardDescription>Pre-written messages for common scenarios</CardDescription>
              </div>
              <Button variant="outline" data-testid="button-create-template">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {defaultTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="bg-white/5 border-white/10 hover-elevate cursor-pointer"
                    onClick={() => {
                      setMessage(template.content);
                      toast({
                        title: "Template Loaded",
                        description: `"${template.name}" template has been loaded.`,
                      });
                    }}
                    data-testid={`template-card-${template.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {template.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
