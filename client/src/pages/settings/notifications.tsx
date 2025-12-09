import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageSquare, Save, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";

export default function NotificationsPage() {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState(false);

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenant"],
  });

  const [formData, setFormData] = useState({
    smsProvider: "mock",
    smsApiKey: "",
    smsUsername: "",
    smsSenderId: "",
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        smsProvider: tenant.smsProvider || "mock",
        smsApiKey: tenant.smsApiKey || "",
        smsUsername: tenant.smsUsername || "",
        smsSenderId: tenant.smsSenderId || "",
      });
    }
  }, [tenant]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PATCH", "/api/tenant", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Settings Saved",
        description: "Your notification settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="p-6 space-y-6" data-testid="settings-notifications-page">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-muted-foreground">
          Configure SMS provider for customer notifications and campaigns
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <GlassPanel size="md">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <MessageSquare size={20} className="text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">SMS Integration</h2>
                <p className="text-sm text-muted-foreground">
                  Configure SMS provider for customer notifications and campaigns
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSecrets(!showSecrets)}
              data-testid="button-toggle-sms-secrets"
            >
              {showSecrets ? (
                <>
                  <EyeOff size={16} className="mr-2" />
                  Hide
                </>
              ) : (
                <>
                  <Eye size={16} className="mr-2" />
                  Show
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">SMS Provider</Label>
              <Select 
                value={formData.smsProvider} 
                onValueChange={(value) => setFormData({ ...formData, smsProvider: value })}
              >
                <SelectTrigger className="glass-input" data-testid="select-sms-provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock (Testing)</SelectItem>
                  <SelectItem value="africas_talking">Africa's Talking</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Use Mock for testing, Africa's Talking for production in Kenya
              </p>
            </div>

            <GlassInput
              label="Sender ID"
              placeholder="YOURCOMPANY"
              value={formData.smsSenderId}
              onChange={(e) => setFormData({ ...formData, smsSenderId: e.target.value })}
              data-testid="input-sms-sender-id"
            />

            <GlassInput
              label="API Key"
              type={showSecrets ? "text" : "password"}
              placeholder="Your SMS API Key"
              value={formData.smsApiKey}
              onChange={(e) => setFormData({ ...formData, smsApiKey: e.target.value })}
              data-testid="input-sms-api-key"
            />

            <GlassInput
              label="Username"
              placeholder="sandbox or your username"
              value={formData.smsUsername}
              onChange={(e) => setFormData({ ...formData, smsUsername: e.target.value })}
              data-testid="input-sms-username"
            />
          </div>

          <div className="mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-sm text-muted-foreground">
              For Africa's Talking, get your credentials from the{" "}
              <a
                href="https://africastalking.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300"
              >
                Africa's Talking Dashboard
              </a>
              . Use "sandbox" as username for testing. SMS campaigns are available for Tier 2 subscribers.
            </p>
          </div>
        </GlassPanel>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="gradient-btn px-8"
            disabled={saveMutation.isPending}
            data-testid="button-save-notifications"
          >
            <Save size={18} className="mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Notification Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
