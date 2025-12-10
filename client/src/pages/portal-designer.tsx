import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Palette, 
  Image, 
  Type, 
  Phone, 
  Mail, 
  Save, 
  Eye, 
  Sparkles,
  Wifi,
  Check,
  ArrowLeft,
  Upload,
  Monitor,
  Smartphone,
  MessageSquare
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput, GlassTextarea } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Tenant, Plan } from "@shared/schema";

interface BrandingConfig {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
  welcomeMessage?: string;
  supportEmail?: string;
  supportPhone?: string;
  footerText?: string;
  showPoweredBy?: boolean;
  cardStyle?: 'glass' | 'solid' | 'gradient';
  animationsEnabled?: boolean;
  backgroundGradient?: string;
}

const defaultColors = {
  cyan: "#22d3ee",
  purple: "#a855f7",
  green: "#22c55e",
  blue: "#3b82f6",
  orange: "#f97316",
  pink: "#ec4899",
};

const gradientPresets = [
  { name: "Ocean", value: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)" },
  { name: "Midnight", value: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)" },
  { name: "Sunset", value: "linear-gradient(135deg, #1a0a1e 0%, #2d1b3d 50%, #1a1a2e 100%)" },
  { name: "Forest", value: "linear-gradient(135deg, #0a1a14 0%, #1a2e22 50%, #0f1a14 100%)" },
];

export default function PortalDesignerPage() {
  const { toast } = useToast();
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('mobile');
  
  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenant"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans?type=HOTSPOT"],
  });

  const [branding, setBranding] = useState<BrandingConfig>({
    logo: "",
    primaryColor: "#22d3ee",
    secondaryColor: "#a855f7",
    tagline: "",
    welcomeMessage: "Connect to Wi-Fi",
    supportEmail: "",
    supportPhone: "",
    footerText: "",
    showPoweredBy: true,
    cardStyle: "glass",
    animationsEnabled: true,
    backgroundGradient: gradientPresets[0].value,
  });

  useEffect(() => {
    if (tenant?.brandingConfig) {
      const config = tenant.brandingConfig;
      setBranding({
        logo: config.logo || "",
        primaryColor: config.primaryColor || "#22d3ee",
        secondaryColor: config.secondaryColor || "#a855f7",
        tagline: config.tagline || "",
        welcomeMessage: config.welcomeMessage || "Connect to Wi-Fi",
        supportEmail: config.supportEmail || "",
        supportPhone: config.supportPhone || "",
        footerText: config.footerText || "",
        showPoweredBy: config.showPoweredBy ?? true,
        cardStyle: config.cardStyle || "glass",
        animationsEnabled: config.animationsEnabled ?? true,
        backgroundGradient: config.backgroundGradient || gradientPresets[0].value,
      });
    }
  }, [tenant]);

  const saveMutation = useMutation({
    mutationFn: async (brandingConfig: BrandingConfig) => {
      return apiRequest("PATCH", "/api/tenant", { brandingConfig });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Design Saved",
        description: "Your captive portal design has been published successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save design",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(branding);
  };

  const gradientStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
  }), [branding.primaryColor, branding.secondaryColor]);

  const samplePlans = plans?.filter(p => p.isActive).slice(0, 3) || [
    { id: "1", name: "1 Hour", price: 20, durationSeconds: 3600 },
    { id: "2", name: "Daily", price: 50, durationSeconds: 86400 },
    { id: "3", name: "Weekly", price: 300, durationSeconds: 604800 },
  ];

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="portal-designer-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/hotspot-plans">
            <Button variant="ghost" size="icon" data-testid="button-back-to-plans">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Portal Designer</h1>
            <p className="text-muted-foreground">
              Design your captive portal with live preview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            <Button
              variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPreviewDevice('mobile')}
              data-testid="button-preview-mobile"
            >
              <Smartphone size={16} />
            </Button>
            <Button
              variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPreviewDevice('desktop')}
              data-testid="button-preview-desktop"
            >
              <Monitor size={16} />
            </Button>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="gap-2"
            style={gradientStyle}
            data-testid="button-publish-design"
          >
            <Save size={18} />
            {saveMutation.isPending ? "Publishing..." : "Publish Design"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Tabs defaultValue="branding" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/5">
              <TabsTrigger value="branding" className="gap-2 text-xs sm:text-sm" data-testid="tab-branding">
                <Palette size={14} />
                <span className="hidden sm:inline">Brand</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="gap-2 text-xs sm:text-sm" data-testid="tab-content">
                <Type size={14} />
                <span className="hidden sm:inline">Content</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="gap-2 text-xs sm:text-sm" data-testid="tab-contact">
                <Phone size={14} />
                <span className="hidden sm:inline">Contact</span>
              </TabsTrigger>
              <TabsTrigger value="style" className="gap-2 text-xs sm:text-sm" data-testid="tab-style">
                <Sparkles size={14} />
                <span className="hidden sm:inline">Style</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="mt-4">
              <GlassPanel size="md" className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Image size={18} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Logo & Colors</h3>
                    <p className="text-sm text-muted-foreground">Upload your logo and set brand colors</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Logo URL</Label>
                    <GlassInput
                      placeholder="https://yoursite.com/logo.png"
                      value={branding.logo}
                      onChange={(e) => setBranding({ ...branding, logo: e.target.value })}
                      icon={<Upload size={16} />}
                      data-testid="input-logo-url"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 200x60px transparent PNG
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={branding.primaryColor}
                          onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                          className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                          data-testid="input-primary-color"
                        />
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(defaultColors).slice(0, 3).map(([name, color]) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => setBranding({ ...branding, primaryColor: color })}
                              className="w-6 h-6 rounded-full border-2 border-white/20 transition-transform hover:scale-110"
                              style={{ backgroundColor: color }}
                              title={name}
                              data-testid={`color-primary-${name}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Secondary Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={branding.secondaryColor}
                          onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                          className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                          data-testid="input-secondary-color"
                        />
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(defaultColors).slice(3).map(([name, color]) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => setBranding({ ...branding, secondaryColor: color })}
                              className="w-6 h-6 rounded-full border-2 border-white/20 transition-transform hover:scale-110"
                              style={{ backgroundColor: color }}
                              title={name}
                              data-testid={`color-secondary-${name}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </TabsContent>

            <TabsContent value="content" className="mt-4">
              <GlassPanel size="md" className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Type size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Text Content</h3>
                    <p className="text-sm text-muted-foreground">Customize your portal messages</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <GlassInput
                    label="Tagline"
                    placeholder="Fast & Reliable WiFi"
                    value={branding.tagline}
                    onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                    data-testid="input-tagline"
                  />

                  <GlassInput
                    label="Welcome Message"
                    placeholder="Connect to Wi-Fi"
                    value={branding.welcomeMessage}
                    onChange={(e) => setBranding({ ...branding, welcomeMessage: e.target.value })}
                    data-testid="input-welcome-message"
                  />

                  <GlassTextarea
                    label="Footer Text"
                    placeholder="Thank you for choosing our WiFi service..."
                    value={branding.footerText}
                    onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
                    data-testid="input-footer-text"
                  />
                </div>
              </GlassPanel>
            </TabsContent>

            <TabsContent value="contact" className="mt-4">
              <GlassPanel size="md" className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <MessageSquare size={18} className="text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Support Contact</h3>
                    <p className="text-sm text-muted-foreground">Display contact info for customer support</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <GlassInput
                    label="Support Email"
                    placeholder="support@yourcompany.com"
                    value={branding.supportEmail}
                    onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })}
                    icon={<Mail size={16} />}
                    data-testid="input-support-email"
                  />

                  <GlassInput
                    label="Support Phone"
                    placeholder="+254 700 123 456"
                    value={branding.supportPhone}
                    onChange={(e) => setBranding({ ...branding, supportPhone: e.target.value })}
                    icon={<Phone size={16} />}
                    data-testid="input-support-phone"
                  />
                </div>
              </GlassPanel>
            </TabsContent>

            <TabsContent value="style" className="mt-4">
              <GlassPanel size="md" className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Sparkles size={18} className="text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Visual Style</h3>
                    <p className="text-sm text-muted-foreground">Configure animations and effects</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-muted-foreground">Card Style</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['glass', 'solid', 'gradient'] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setBranding({ ...branding, cardStyle: style })}
                          className={`p-3 rounded-xl border transition-all text-sm capitalize ${
                            branding.cardStyle === style
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20'
                          }`}
                          data-testid={`card-style-${style}`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-muted-foreground">Background Theme</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {gradientPresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setBranding({ ...branding, backgroundGradient: preset.value })}
                          className={`p-3 rounded-xl border transition-all text-sm ${
                            branding.backgroundGradient === preset.value
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                          style={{ background: preset.value }}
                          data-testid={`bg-theme-${preset.name.toLowerCase()}`}
                        >
                          <span className="text-white/80">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Enable Animations</Label>
                      <p className="text-xs text-muted-foreground">Smooth transitions and effects</p>
                    </div>
                    <Switch
                      checked={branding.animationsEnabled}
                      onCheckedChange={(checked) => setBranding({ ...branding, animationsEnabled: checked })}
                      data-testid="switch-animations"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Show "Powered by MnetiFi"</Label>
                      <p className="text-xs text-muted-foreground">Display attribution in footer</p>
                    </div>
                    <Switch
                      checked={branding.showPoweredBy}
                      onCheckedChange={(checked) => setBranding({ ...branding, showPoweredBy: checked })}
                      data-testid="switch-powered-by"
                    />
                  </div>
                </div>
              </GlassPanel>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:sticky lg:top-6">
          <GlassPanel size="sm" className="mb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Live Preview</span>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                {previewDevice === 'mobile' ? 'Mobile' : 'Desktop'}
              </span>
            </div>
          </GlassPanel>

          <div 
            className={`relative rounded-2xl overflow-hidden border border-white/10 ${
              previewDevice === 'mobile' ? 'max-w-[375px] mx-auto' : 'w-full'
            }`}
            style={{ 
              background: branding.backgroundGradient,
              minHeight: previewDevice === 'mobile' ? '667px' : '500px'
            }}
          >
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/2 -left-1/2 w-[800px] h-[800px] rounded-full opacity-30 blur-3xl"
                style={{ background: `radial-gradient(circle, ${branding.primaryColor}30 0%, transparent 70%)` }} 
              />
              <div className="absolute -bottom-1/2 -right-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
                style={{ background: `radial-gradient(circle, ${branding.secondaryColor}30 0%, transparent 70%)` }}
              />
            </div>

            <div className="relative p-6 h-full flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key="preview-content"
                  initial={branding.animationsEnabled ? { opacity: 0, y: 20 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex-1"
                >
                  <div 
                    className={`p-6 rounded-2xl ${
                      branding.cardStyle === 'glass' 
                        ? 'bg-white/10 backdrop-blur-xl border border-white/20' 
                        : branding.cardStyle === 'solid'
                        ? 'bg-slate-900/90 border border-white/10'
                        : ''
                    }`}
                    style={branding.cardStyle === 'gradient' ? {
                      background: `linear-gradient(135deg, ${branding.primaryColor}20, ${branding.secondaryColor}20)`,
                      border: '1px solid rgba(255,255,255,0.1)'
                    } : {}}
                  >
                    <div className="text-center mb-6">
                      {branding.logo ? (
                        <img
                          src={branding.logo}
                          alt="Logo"
                          className="h-10 mx-auto mb-3 object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${branding.primaryColor}20` }}
                          >
                            <Wifi size={18} style={{ color: branding.primaryColor }} />
                          </div>
                          <span
                            className="text-xl font-bold"
                            style={{
                              background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            {tenant?.name || "Your ISP"}
                          </span>
                        </div>
                      )}
                      
                      {branding.tagline && (
                        <p className="text-white/60 text-sm mb-1">{branding.tagline}</p>
                      )}
                      <p className="text-white/80 text-sm">{branding.welcomeMessage || "Connect to Wi-Fi"}</p>
                    </div>

                    <div className="space-y-3 mb-6">
                      <p className="text-xs text-white/50 uppercase tracking-wider">Choose Your Plan</p>
                      {samplePlans.map((plan, index) => (
                        <motion.div
                          key={plan.id}
                          initial={branding.animationsEnabled ? { opacity: 0, x: -20 } : false}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-3 rounded-xl cursor-pointer transition-all ${
                            branding.cardStyle === 'glass'
                              ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                              : branding.cardStyle === 'solid'
                              ? 'bg-slate-800/50 hover:bg-slate-800/70 border border-white/5'
                              : 'hover:bg-white/5 border border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-white text-sm font-medium">{plan.name}</p>
                              <p className="text-white/50 text-xs">{formatDuration(plan.durationSeconds)}</p>
                            </div>
                            <span
                              className="text-lg font-bold"
                              style={{
                                background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                              }}
                            >
                              {formatPrice(plan.price)}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <motion.button
                      whileHover={branding.animationsEnabled ? { scale: 1.02 } : undefined}
                      whileTap={branding.animationsEnabled ? { scale: 0.98 } : undefined}
                      className="w-full py-3 rounded-xl text-white font-medium transition-all"
                      style={gradientStyle}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Check size={18} />
                        Select Plan
                      </span>
                    </motion.button>
                  </div>

                  {(branding.supportEmail || branding.supportPhone) && (
                    <div className="mt-4 text-center">
                      <p className="text-white/40 text-xs mb-1">Need help?</p>
                      <div className="flex items-center justify-center gap-3 text-xs">
                        {branding.supportEmail && (
                          <span className="flex items-center gap-1 text-white/60">
                            <Mail size={12} />
                            {branding.supportEmail}
                          </span>
                        )}
                        {branding.supportPhone && (
                          <span className="flex items-center gap-1 text-white/60">
                            <Phone size={12} />
                            {branding.supportPhone}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {branding.footerText && (
                    <p className="mt-4 text-center text-white/40 text-xs">
                      {branding.footerText}
                    </p>
                  )}

                  {branding.showPoweredBy && (
                    <p className="mt-4 text-center text-white/30 text-xs">
                      Powered by MnetiFi
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
