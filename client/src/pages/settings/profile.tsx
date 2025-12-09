import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Palette, Save, Upload, Wifi, Globe, Mail, Phone } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";

const defaultColors = {
  cyan: "#22d3ee",
  purple: "#a855f7",
  green: "#22c55e",
  blue: "#3b82f6",
  orange: "#f97316",
  pink: "#ec4899",
};

export default function ProfileSettingsPage() {
  const { toast } = useToast();

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenant"],
  });

  const [formData, setFormData] = useState({
    name: "",
    subdomain: "",
    website: "",
    email: "",
    phone: "",
  });

  const [brandingData, setBrandingData] = useState({
    logo: "",
    primaryColor: "#22d3ee",
    secondaryColor: "#a855f7",
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || "",
        subdomain: tenant.subdomain || "",
        website: tenant.website || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
      });
      const branding = tenant.brandingConfig || {};
      setBrandingData({
        logo: branding.logo || "",
        primaryColor: branding.primaryColor || "#22d3ee",
        secondaryColor: branding.secondaryColor || "#a855f7",
      });
    }
  }, [tenant]);

  const saveMutation = useMutation({
    mutationFn: async (data: { formData: typeof formData; brandingData: typeof brandingData }) => {
      return apiRequest("PATCH", "/api/tenant", {
        ...data.formData,
        brandingConfig: data.brandingData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Settings Saved",
        description: "Your profile settings have been updated successfully.",
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
    saveMutation.mutate({ formData, brandingData });
  };

  return (
    <div className="p-6 space-y-6" data-testid="settings-profile-page">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-muted-foreground">
          Configure your organization details and branding
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="space-y-2">
              <GlassInput
                label="Subdomain"
                placeholder="yourcompany"
                value={formData.subdomain}
                onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                data-testid="input-subdomain"
              />
              <p className="text-xs text-muted-foreground">
                Your portal will be: <span className="text-cyan-400">{formData.subdomain || 'yourcompany'}.mnetifi.com</span>
              </p>
            </div>
            <GlassInput
              label="Website"
              placeholder="https://www.yourcompany.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              icon={<Globe size={16} />}
              data-testid="input-website"
            />
            <GlassInput
              label="Email Address"
              placeholder="info@yourcompany.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={<Mail size={16} />}
              data-testid="input-email"
            />
            <GlassInput
              label="Phone Number"
              placeholder="+254 700 123 456"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              icon={<Phone size={16} />}
              data-testid="input-phone"
            />
          </div>
        </GlassPanel>

        <GlassPanel size="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Palette size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Branding & Customization</h2>
              <p className="text-sm text-muted-foreground">
                Customize how your captive portal appears to customers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Logo URL</Label>
              <GlassInput
                placeholder="https://example.com/logo.png"
                value={brandingData.logo}
                onChange={(e) => setBrandingData({ ...brandingData, logo: e.target.value })}
                icon={<Upload size={16} />}
                data-testid="input-logo-url"
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to your logo image (recommended: 200x60px PNG)
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandingData.primaryColor}
                    onChange={(e) => setBrandingData({ ...brandingData, primaryColor: e.target.value })}
                    className="w-12 h-9 rounded-md border border-white/10 bg-transparent cursor-pointer"
                    data-testid="input-primary-color"
                  />
                  <div className="flex gap-2">
                    {Object.entries(defaultColors).map(([name, color]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setBrandingData({ ...brandingData, primaryColor: color })}
                        className="w-6 h-6 rounded-full border-2 border-white/20 transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        title={name}
                        data-testid={`color-preset-${name}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandingData.secondaryColor}
                    onChange={(e) => setBrandingData({ ...brandingData, secondaryColor: e.target.value })}
                    className="w-12 h-9 rounded-md border border-white/10 bg-transparent cursor-pointer"
                    data-testid="input-secondary-color"
                  />
                  <div className="flex gap-2">
                    {Object.entries(defaultColors).map(([name, color]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setBrandingData({ ...brandingData, secondaryColor: color })}
                        className="w-6 h-6 rounded-full border-2 border-white/20 transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        title={name}
                        data-testid={`color-secondary-preset-${name}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-6 rounded-xl bg-mesh-navy/50 border border-white/5">
            <p className="text-xs text-muted-foreground mb-4 text-center">Captive Portal Preview</p>
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {brandingData.logo ? (
                <img
                  src={brandingData.logo}
                  alt="Logo"
                  className="h-12 mx-auto mb-4 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${brandingData.primaryColor}20` }}
                  >
                    <Wifi size={24} style={{ color: brandingData.primaryColor }} />
                  </div>
                  <span
                    className="text-2xl font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${brandingData.primaryColor}, ${brandingData.secondaryColor})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {formData.name || "Your ISP"}
                  </span>
                </div>
              )}
              <p className="text-muted-foreground text-sm">
                Connect to {formData.name || "Your Organization"} Wi-Fi
              </p>
              <button
                type="button"
                className="mt-4 px-6 py-2 rounded-xl text-white font-medium transition-all"
                style={{
                  background: `linear-gradient(135deg, ${brandingData.primaryColor}, ${brandingData.secondaryColor})`,
                }}
              >
                Select Plan
              </button>
            </motion.div>
          </div>
        </GlassPanel>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="gradient-btn px-8"
            disabled={saveMutation.isPending}
            data-testid="button-save-profile"
          >
            <Save size={18} className="mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
