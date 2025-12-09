import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wifi, Server, Shield, Save, Eye, EyeOff } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";

export default function HotspotSettingsPage() {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState(false);

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenant"],
  });

  const [formData, setFormData] = useState({
    radiusServer: "",
    radiusSecret: "",
    radiusPort: "1812",
    radiusAcctPort: "1813",
    nasIdentifier: "",
    coaEnabled: false,
    coaPort: "3799",
  });

  useEffect(() => {
    if (tenant) {
      const hotspotConfig = (tenant as any).hotspotConfig || {};
      setFormData({
        radiusServer: hotspotConfig.radiusServer || "",
        radiusSecret: hotspotConfig.radiusSecret || "",
        radiusPort: hotspotConfig.radiusPort || "1812",
        radiusAcctPort: hotspotConfig.radiusAcctPort || "1813",
        nasIdentifier: hotspotConfig.nasIdentifier || "",
        coaEnabled: hotspotConfig.coaEnabled || false,
        coaPort: hotspotConfig.coaPort || "3799",
      });
    }
  }, [tenant]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PATCH", "/api/tenant", {
        hotspotConfig: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Settings Saved",
        description: "Your hotspot settings have been updated successfully.",
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
    <div className="p-6 space-y-6" data-testid="settings-hotspot-page">
      <div>
        <h1 className="text-2xl font-bold text-white">Hotspot Settings</h1>
        <p className="text-muted-foreground">
          Configure RADIUS server and NAS settings for your hotspots
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <GlassPanel size="md">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Server size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">RADIUS Server Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  Configure your RADIUS server connection
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSecrets(!showSecrets)}
              data-testid="button-toggle-radius-secrets"
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
              label="RADIUS Server IP/Hostname"
              placeholder="radius.example.com or 192.168.1.100"
              value={formData.radiusServer}
              onChange={(e) => setFormData({ ...formData, radiusServer: e.target.value })}
              icon={<Server size={16} />}
              data-testid="input-radius-server"
            />
            <GlassInput
              label="RADIUS Secret"
              type={showSecrets ? "text" : "password"}
              placeholder="Your RADIUS shared secret"
              value={formData.radiusSecret}
              onChange={(e) => setFormData({ ...formData, radiusSecret: e.target.value })}
              icon={<Shield size={16} />}
              data-testid="input-radius-secret"
            />
            <GlassInput
              label="Authentication Port"
              placeholder="1812"
              value={formData.radiusPort}
              onChange={(e) => setFormData({ ...formData, radiusPort: e.target.value })}
              data-testid="input-radius-port"
            />
            <GlassInput
              label="Accounting Port"
              placeholder="1813"
              value={formData.radiusAcctPort}
              onChange={(e) => setFormData({ ...formData, radiusAcctPort: e.target.value })}
              data-testid="input-radius-acct-port"
            />
          </div>
        </GlassPanel>

        <GlassPanel size="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Wifi size={20} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">NAS Configuration</h2>
              <p className="text-sm text-muted-foreground">
                Network Access Server settings
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassInput
              label="NAS Identifier"
              placeholder="Your NAS identifier"
              value={formData.nasIdentifier}
              onChange={(e) => setFormData({ ...formData, nasIdentifier: e.target.value })}
              data-testid="input-nas-identifier"
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <Label className="text-white">Enable CoA (Change of Authorization)</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow dynamic session disconnection
                  </p>
                </div>
                <Switch
                  checked={formData.coaEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, coaEnabled: checked })}
                  data-testid="switch-coa-enabled"
                />
              </div>

              {formData.coaEnabled && (
                <GlassInput
                  label="CoA Port"
                  placeholder="3799"
                  value={formData.coaPort}
                  onChange={(e) => setFormData({ ...formData, coaPort: e.target.value })}
                  data-testid="input-coa-port"
                />
              )}
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-muted-foreground">
              These settings apply to all hotspots by default. Individual hotspots can override these settings in the Hotspots management page.
            </p>
          </div>
        </GlassPanel>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="gradient-btn px-8"
            disabled={saveMutation.isPending}
            data-testid="button-save-hotspot-settings"
          >
            <Save size={18} className="mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Hotspot Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
