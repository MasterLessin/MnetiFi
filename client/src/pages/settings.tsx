import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Key, Palette, Save, Eye, EyeOff } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState(false);

  // Fetch tenant settings
  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenant"],
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    subdomain: "",
    mpesaShortcode: "",
    mpesaPasskey: "",
    mpesaConsumerKey: "",
    mpesaConsumerSecret: "",
  });

  // Update form when tenant data loads
  useState(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || "",
        subdomain: tenant.subdomain || "",
        mpesaShortcode: tenant.mpesaShortcode || "",
        mpesaPasskey: tenant.mpesaPasskey || "",
        mpesaConsumerKey: tenant.mpesaConsumerKey || "",
        mpesaConsumerSecret: tenant.mpesaConsumerSecret || "",
      });
    }
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PATCH", "/api/tenant", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
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
    <div className="p-6 space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-muted-foreground">
          Configure your tenant and M-Pesa integration settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Settings */}
        <GlassPanel size="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Building2 size={20} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Organization</h2>
              <p className="text-sm text-muted-foreground">
                Basic information about your organization
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassInput
              label="Organization Name"
              placeholder="Your Company Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              data-testid="input-org-name"
            />
            <GlassInput
              label="Subdomain"
              placeholder="yourcompany"
              value={formData.subdomain}
              onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
              data-testid="input-subdomain"
            />
          </div>
        </GlassPanel>

        {/* M-Pesa Settings */}
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

        {/* Branding Preview */}
        <GlassPanel size="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Palette size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Branding Preview</h2>
              <p className="text-sm text-muted-foreground">
                How your captive portal will appear to users
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center p-8 rounded-xl bg-mesh-navy/50 border border-white/5">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <MnetiFiLogo size="xl" className="justify-center mb-4" />
              <p className="text-muted-foreground">
                {formData.name || "Your Organization"} Wi-Fi
              </p>
            </motion.div>
          </div>
        </GlassPanel>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            className="gradient-btn px-8"
            disabled={saveMutation.isPending}
            data-testid="button-save-settings"
          >
            <Save size={18} className="mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
