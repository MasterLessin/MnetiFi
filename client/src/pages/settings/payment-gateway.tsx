import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Key, Save, Eye, EyeOff } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";

export default function PaymentGatewayPage() {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState(false);

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenant"],
  });

  const [formData, setFormData] = useState({
    mpesaShortcode: "",
    mpesaPasskey: "",
    mpesaConsumerKey: "",
    mpesaConsumerSecret: "",
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        mpesaShortcode: tenant.mpesaShortcode || "",
        mpesaPasskey: tenant.mpesaPasskey || "",
        mpesaConsumerKey: tenant.mpesaConsumerKey || "",
        mpesaConsumerSecret: tenant.mpesaConsumerSecret || "",
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
        description: "Your M-Pesa settings have been updated successfully.",
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
    <div className="p-6 space-y-6" data-testid="settings-payment-gateway-page">
      <div>
        <h1 className="text-2xl font-bold text-white">Payment Gateway</h1>
        <p className="text-muted-foreground">
          Configure M-Pesa and other payment integrations
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <GlassPanel size="md">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Key size={20} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">M-Pesa Integration</h2>
                <p className="text-sm text-muted-foreground">
                  Safaricom Daraja API credentials
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSecrets(!showSecrets)}
              data-testid="button-toggle-secrets"
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
            <GlassInput
              label="Business Shortcode"
              placeholder="174379"
              value={formData.mpesaShortcode}
              onChange={(e) => setFormData({ ...formData, mpesaShortcode: e.target.value })}
              data-testid="input-shortcode"
            />
            <GlassInput
              label="Passkey"
              type={showSecrets ? "text" : "password"}
              placeholder="Your Passkey"
              value={formData.mpesaPasskey}
              onChange={(e) => setFormData({ ...formData, mpesaPasskey: e.target.value })}
              data-testid="input-passkey"
            />
            <GlassInput
              label="Consumer Key"
              type={showSecrets ? "text" : "password"}
              placeholder="Your Consumer Key"
              value={formData.mpesaConsumerKey}
              onChange={(e) => setFormData({ ...formData, mpesaConsumerKey: e.target.value })}
              data-testid="input-consumer-key"
            />
            <GlassInput
              label="Consumer Secret"
              type={showSecrets ? "text" : "password"}
              placeholder="Your Consumer Secret"
              value={formData.mpesaConsumerSecret}
              onChange={(e) => setFormData({ ...formData, mpesaConsumerSecret: e.target.value })}
              data-testid="input-consumer-secret"
            />
          </div>

          <div className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm text-muted-foreground">
              Get your M-Pesa credentials from the{" "}
              <a
                href="https://developer.safaricom.co.ke/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300"
              >
                Safaricom Developer Portal
              </a>
              . Use sandbox credentials for testing.
            </p>
          </div>
        </GlassPanel>

        <GlassPanel size="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Key size={20} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">OTP Payments</h2>
              <p className="text-sm text-muted-foreground">
                Coming soon - Alternative payment verification
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-muted-foreground">
              OTP-based payment verification will be available in a future update.
            </p>
          </div>
        </GlassPanel>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="gradient-btn px-8"
            disabled={saveMutation.isPending}
            data-testid="button-save-payment"
          >
            <Save size={18} className="mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Payment Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
