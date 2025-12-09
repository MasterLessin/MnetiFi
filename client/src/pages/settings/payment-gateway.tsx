import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Key, Save, Eye, EyeOff, Shield, Phone, CreditCard, Building2, Smartphone, Crown, Lock } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import type { Tenant } from "@shared/schema";

type MpesaType = "TILL" | "PAYBILL";

export default function PaymentGatewayPage() {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState(false);
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [phoneHint, setPhoneHint] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenant"],
  });

  const [formData, setFormData] = useState({
    mpesaShortcode: "",
    mpesaPasskey: "",
    mpesaConsumerKey: "",
    mpesaConsumerSecret: "",
    mpesaType: "PAYBILL" as MpesaType,
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        mpesaShortcode: tenant.mpesaShortcode || "",
        mpesaPasskey: tenant.mpesaPasskey || "",
        mpesaConsumerKey: tenant.mpesaConsumerKey || "",
        mpesaConsumerSecret: tenant.mpesaConsumerSecret || "",
        mpesaType: ((tenant as any).mpesaType as MpesaType) || "PAYBILL",
      });
    }
  }, [tenant]);

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/settings/otp/send", {});
    },
    onSuccess: (data: any) => {
      setPhoneHint(data.phoneHint || "");
      setIsOtpDialogOpen(true);
      toast({
        title: "OTP Sent",
        description: "A verification code has been sent to your phone.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (otp: string) => {
      return apiRequest("POST", "/api/settings/otp/verify", { otp });
    },
    onSuccess: (data: any) => {
      setIsVerified(true);
      setVerificationToken(data.token);
      setIsOtpDialogOpen(false);
      setOtpValue("");
      toast({
        title: "Verified",
        description: "You can now edit payment settings.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    },
  });

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
      setIsVerified(false);
      setVerificationToken(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleVerifyClick = () => {
    sendOtpMutation.mutate();
  };

  const handleOtpComplete = (value: string) => {
    if (value.length === 6) {
      verifyOtpMutation.mutate(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast({
        title: "Verification Required",
        description: "Please verify your identity before saving changes.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(formData);
  };

  const premiumPaymentOptions = [
    {
      name: "Airtel Money",
      description: "Accept payments via Airtel Money",
      icon: Smartphone,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
    },
    {
      name: "PayPal",
      description: "International payments via PayPal",
      icon: CreditCard,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    {
      name: "Bank Transfer",
      description: "Direct bank transfer payments",
      icon: Building2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
    },
  ];

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
            <div className="flex items-center gap-2">
              {isVerified ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                  <Shield size={12} className="mr-1" />
                  Verified
                </Badge>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyClick}
                  disabled={sendOtpMutation.isPending}
                  data-testid="button-verify-otp"
                >
                  <Shield size={16} className="mr-2" />
                  {sendOtpMutation.isPending ? "Sending..." : "Verify to Edit"}
                </Button>
              )}
              {isVerified && (
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
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground block mb-3">
              Account Type
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={!isVerified}
                onClick={() => setFormData({ ...formData, mpesaType: "TILL" })}
                className={cn(
                  "flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  formData.mpesaType === "TILL"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-white/5 text-muted-foreground border border-white/10",
                  !isVerified && "opacity-50 cursor-not-allowed"
                )}
                data-testid="button-mpesa-till"
              >
                Till Number
              </button>
              <button
                type="button"
                disabled={!isVerified}
                onClick={() => setFormData({ ...formData, mpesaType: "PAYBILL" })}
                className={cn(
                  "flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  formData.mpesaType === "PAYBILL"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-white/5 text-muted-foreground border border-white/10",
                  !isVerified && "opacity-50 cursor-not-allowed"
                )}
                data-testid="button-mpesa-paybill"
              >
                Paybill
              </button>
            </div>
          </div>

          <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", !isVerified && "opacity-50 pointer-events-none")}>
            <GlassInput
              label={formData.mpesaType === "TILL" ? "Till Number" : "Business Shortcode"}
              placeholder={formData.mpesaType === "TILL" ? "123456" : "174379"}
              value={formData.mpesaShortcode}
              onChange={(e) => setFormData({ ...formData, mpesaShortcode: e.target.value })}
              disabled={!isVerified}
              data-testid="input-shortcode"
            />
            <GlassInput
              label="Passkey"
              type={showSecrets ? "text" : "password"}
              placeholder="Your Passkey"
              value={formData.mpesaPasskey}
              onChange={(e) => setFormData({ ...formData, mpesaPasskey: e.target.value })}
              disabled={!isVerified}
              data-testid="input-passkey"
            />
            <GlassInput
              label="Consumer Key"
              type={showSecrets ? "text" : "password"}
              placeholder="Your Consumer Key"
              value={formData.mpesaConsumerKey}
              onChange={(e) => setFormData({ ...formData, mpesaConsumerKey: e.target.value })}
              disabled={!isVerified}
              data-testid="input-consumer-key"
            />
            <GlassInput
              label="Consumer Secret"
              type={showSecrets ? "text" : "password"}
              placeholder="Your Consumer Secret"
              value={formData.mpesaConsumerSecret}
              onChange={(e) => setFormData({ ...formData, mpesaConsumerSecret: e.target.value })}
              disabled={!isVerified}
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
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Crown size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Premium Payment Options</h2>
              <p className="text-sm text-muted-foreground">
                Upgrade to Premium to unlock additional payment methods
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {premiumPaymentOptions.map((option) => (
              <div
                key={option.name}
                className="relative p-4 rounded-xl bg-white/5 border border-white/10 opacity-50 pointer-events-none"
                data-testid={`premium-option-${option.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Badge
                  className="absolute top-2 right-2 bg-purple-500/20 text-purple-400 border-0"
                >
                  <Lock size={10} className="mr-1" />
                  Premium
                </Badge>
                <div className={cn("p-2 rounded-lg w-fit mb-3", option.bgColor)}>
                  <option.icon size={20} className={option.color} />
                </div>
                <h3 className="font-medium text-white mb-1">{option.name}</h3>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            ))}
          </div>
        </GlassPanel>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="gradient-btn px-8"
            disabled={saveMutation.isPending || !isVerified}
            data-testid="button-save-payment"
          >
            <Save size={18} className="mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Payment Settings"}
          </Button>
        </div>
      </form>

      <Dialog open={isOtpDialogOpen} onOpenChange={setIsOtpDialogOpen}>
        <DialogContent className="glass-panel border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Shield size={20} className="text-cyan-400" />
              Verify Your Identity
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter the 6-digit code sent to {phoneHint || "your phone"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-4">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={(value) => {
                setOtpValue(value);
                if (value.length === 6) {
                  handleOtpComplete(value);
                }
              }}
              data-testid="input-otp"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            <div className="flex flex-col gap-2 w-full">
              <Button
                onClick={() => verifyOtpMutation.mutate(otpValue)}
                disabled={otpValue.length !== 6 || verifyOtpMutation.isPending}
                className="w-full gradient-btn"
                data-testid="button-confirm-otp"
              >
                {verifyOtpMutation.isPending ? "Verifying..." : "Verify Code"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => sendOtpMutation.mutate()}
                disabled={sendOtpMutation.isPending}
                className="w-full"
                data-testid="button-resend-otp"
              >
                <Phone size={16} className="mr-2" />
                {sendOtpMutation.isPending ? "Sending..." : "Resend Code"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
