import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Coins,
  Phone
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SmsBalance {
  success: boolean;
  balance?: string;
  error?: string;
}

interface SmsTestResult {
  success: boolean;
  messageId?: string;
  cost?: string;
  balance?: string;
  error?: string;
}

export default function SuperAdminSmsSettingsPage() {
  const { toast } = useToast();
  const [testPhone, setTestPhone] = useState("");

  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useQuery<SmsBalance>({
    queryKey: ["/api/superadmin/sms/balance"],
  });

  const testSmsMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest("POST", "/api/superadmin/sms/test", { phone });
      return response.json() as Promise<SmsTestResult>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Test SMS Sent",
          description: `Message ID: ${data.messageId}. Cost: ${data.cost} credits.`,
        });
        refetchBalance();
      } else {
        toast({
          title: "SMS Failed",
          description: data.error || "Failed to send test SMS",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send test SMS",
        variant: "destructive",
      });
    },
  });

  const handleTestSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }
    testSmsMutation.mutate(testPhone);
  };

  const isConfigured = !!process.env.MOBITECH_API_KEY || (balance?.success && balance?.balance);

  return (
    <div className="p-6 space-y-6" data-testid="superadmin-sms-settings-page">
      <div>
        <h1 className="text-2xl font-bold text-white">SMS Settings</h1>
        <p className="text-muted-foreground">
          Platform SMS configuration for OTP verification and notifications
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassPanel size="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <MessageSquare size={20} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">SMS Provider Status</h2>
              <p className="text-sm text-muted-foreground">
                Mobitech Technologies Integration
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Provider</span>
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-0">
                Mobitech Technologies
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Sender Name</span>
              </div>
              <Badge className="bg-purple-500/20 text-purple-400 border-0">
                MNETIFI
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Status</span>
              </div>
              {balanceLoading ? (
                <Badge className="bg-gray-500/20 text-gray-400 border-0">
                  <RefreshCw size={12} className="mr-1 animate-spin" />
                  Checking...
                </Badge>
              ) : balance?.success ? (
                <Badge className="bg-green-500/20 text-green-400 border-0">
                  <CheckCircle2 size={12} className="mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-0">
                  <XCircle size={12} className="mr-1" />
                  Not Configured
                </Badge>
              )}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel size="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Coins size={20} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">SMS Credits</h2>
              <p className="text-sm text-muted-foreground">
                Current account balance
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-8">
            {balanceLoading ? (
              <RefreshCw size={32} className="animate-spin text-muted-foreground" />
            ) : balance?.success ? (
              <>
                <div className="text-4xl font-bold text-white mb-2">
                  {parseFloat(balance.balance || "0").toLocaleString()}
                </div>
                <p className="text-muted-foreground">Available Credits</p>
              </>
            ) : (
              <>
                <XCircle size={32} className="text-red-400 mb-2" />
                <p className="text-muted-foreground text-center">
                  {balance?.error || "API key not configured"}
                </p>
              </>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => refetchBalance()}
            disabled={balanceLoading}
            data-testid="button-refresh-balance"
          >
            <RefreshCw size={16} className={`mr-2 ${balanceLoading ? "animate-spin" : ""}`} />
            Refresh Balance
          </Button>
        </GlassPanel>
      </div>

      <GlassPanel size="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <Send size={20} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Test SMS</h2>
            <p className="text-sm text-muted-foreground">
              Send a test message to verify the integration
            </p>
          </div>
        </div>

        <form onSubmit={handleTestSms} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <GlassInput
                label="Phone Number"
                placeholder="+254 7XX XXX XXX"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                icon={<Phone size={16} />}
                data-testid="input-test-phone"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="gradient-btn"
                disabled={testSmsMutation.isPending || !balance?.success}
                data-testid="button-send-test-sms"
              >
                <Send size={16} className="mr-2" />
                {testSmsMutation.isPending ? "Sending..." : "Send Test"}
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-sm text-muted-foreground">
              This will send a test OTP message to the specified phone number. 
              SMS credits will be deducted from your balance.
            </p>
          </div>
        </form>
      </GlassPanel>

      <GlassPanel size="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <MessageSquare size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">SMS Use Cases</h2>
            <p className="text-sm text-muted-foreground">
              Automated SMS notifications for ISP accounts
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-medium text-white mb-2">OTP Verification</h3>
            <p className="text-sm text-muted-foreground">
              Two-factor authentication codes for ISP admin login and sensitive operations
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-medium text-white mb-2">Payment Confirmations</h3>
            <p className="text-sm text-muted-foreground">
              Subscription payment receipts and billing confirmations for ISPs
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-medium text-white mb-2">Subscription Reminders</h3>
            <p className="text-sm text-muted-foreground">
              Expiry warnings for ISP accounts before their subscription ends
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-medium text-white mb-2">Account Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Suspension notices, reactivation confirmations, and important updates
            </p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel size="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-yellow-500/20">
            <RefreshCw size={20} className="text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Delivery Reports Webhook</h2>
            <p className="text-sm text-muted-foreground">
              Configure Mobitech to send delivery reports
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm text-muted-foreground mb-2">Webhook URL:</p>
            <code className="block p-3 rounded-lg bg-black/30 text-cyan-400 text-sm break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/sms/delivery` : '/api/webhooks/sms/delivery'}
            </code>
          </div>

          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-muted-foreground">
              Configure this webhook URL in your Mobitech Technologies dashboard to receive 
              real-time delivery reports for sent messages.
            </p>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
