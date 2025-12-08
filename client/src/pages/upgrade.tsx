import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Crown, Check, Zap, Shield, Users, BarChart3, MessageSquare, Router, Globe, ArrowRight, Phone, Building, Clock, AlertTriangle } from "lucide-react";
import { SiPaypal } from "react-icons/si";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo, MpesaLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRequireAuth } from "@/hooks/use-session";
import { DashboardLayout } from "@/layouts/dashboard-layout";

type PaymentMethod = "MPESA" | "BANK" | "PAYPAL" | null;

const premiumFeatures = [
  { icon: Router, title: "PPPoE Management", description: "Full PPPoE user and billing management" },
  { icon: Globe, title: "Static IP Billing", description: "Assign and bill static IP addresses" },
  { icon: Users, title: "Technician Accounts", description: "Create sub-accounts for your field technicians" },
  { icon: MessageSquare, title: "SMS Campaigns", description: "Send bulk SMS to your customers" },
  { icon: Shield, title: "Advanced Security", description: "Two-factor authentication and audit logs" },
  { icon: BarChart3, title: "Advanced Reports", description: "Detailed revenue and usage analytics" },
];

const pricingTiers = [
  { duration: "1 Month", price: 2999, perMonth: 2999, popular: false },
  { duration: "3 Months", price: 7999, perMonth: 2666, popular: true },
  { duration: "6 Months", price: 14999, perMonth: 2500, popular: false },
  { duration: "1 Year", price: 24999, perMonth: 2083, popular: false },
];

export default function UpgradePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, subscriptionTier, trialExpiresAt } = useRequireAuth();
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isTrialExpired = trialExpiresAt && new Date(trialExpiresAt) < new Date();
  const isPremium = subscriptionTier === "PREMIUM";

  const handleUpgrade = async () => {
    if (!paymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "MPESA" && !phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your M-Pesa phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMonths: pricingTiers[selectedDuration].duration.includes("Year") ? 12 : parseInt(pricingTiers[selectedDuration].duration),
          paymentMethod,
          phoneNumber: paymentMethod === "MPESA" ? phoneNumber : undefined,
          amount: pricingTiers[selectedDuration].price,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (paymentMethod === "MPESA" && data.checkoutRequestId) {
          toast({
            title: "Payment initiated",
            description: "Please check your phone for the M-Pesa prompt",
          });
        } else {
          toast({
            title: "Upgrade request submitted",
            description: "You will be notified once payment is confirmed",
          });
        }
        
        const sessionStr = localStorage.getItem("admin_session");
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          session.subscriptionTier = "PREMIUM";
          session.subscriptionExpiresAt = data.subscriptionExpiresAt;
          localStorage.setItem("admin_session", JSON.stringify(session));
        }
        
        setLocation("/dashboard");
      } else {
        toast({
          title: "Upgrade failed",
          description: data.error || "Unable to process upgrade",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upgrade failed",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isPremium) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <GlassPanel className="max-w-2xl mx-auto text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Crown size={40} className="text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">You're Already Premium!</h1>
            <p className="text-muted-foreground mb-6">
              You have full access to all MnetiFi features. Thank you for your subscription.
            </p>
            <Link href="/dashboard">
              <Button className="gradient-btn">
                Go to Dashboard
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </GlassPanel>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {isTrialExpired && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={24} className="text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white" data-testid="text-trial-expired">Your Free Trial Has Expired</h3>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to Premium to continue accessing your dashboard and managing your WiFi business.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="text-center mb-8">
            <Badge className="mb-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-0">
              <Crown size={12} className="mr-1" />
              Upgrade to Premium
            </Badge>
            <h1 className="text-3xl font-bold text-white mb-2">Unlock All Features</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Get access to PPPoE, Static IP management, Technician accounts, SMS campaigns, and much more.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <GlassPanel>
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Zap size={20} className="text-cyan-400" />
                Premium Features
              </h2>
              <div className="grid gap-4">
                {premiumFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <feature.icon size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <div className="space-y-6">
              <GlassPanel>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-cyan-400" />
                  Select Duration
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {pricingTiers.map((tier, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDuration(i)}
                      className={`p-4 rounded-xl border transition-all text-left relative ${
                        selectedDuration === i
                          ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                      data-testid={`button-duration-${i}`}
                    >
                      {tier.popular && (
                        <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] border-0">
                          Popular
                        </Badge>
                      )}
                      <p className="font-semibold text-white">{tier.duration}</p>
                      <p className="text-xl font-bold text-purple-400">Ksh {tier.price.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Ksh {tier.perMonth}/month</p>
                    </button>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel>
                <h2 className="text-xl font-semibold text-white mb-4">Payment Method</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setPaymentMethod("MPESA")}
                    className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                      paymentMethod === "MPESA"
                        ? "border-green-500 bg-green-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                    data-testid="button-payment-mpesa"
                  >
                    <MpesaLogo size={32} />
                    <div className="text-left">
                      <p className="font-medium text-white">M-Pesa</p>
                      <p className="text-xs text-muted-foreground">Pay via Lipa Na M-Pesa</p>
                    </div>
                    {paymentMethod === "MPESA" && <Check size={20} className="ml-auto text-green-400" />}
                  </button>

                  <button
                    onClick={() => setPaymentMethod("BANK")}
                    className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                      paymentMethod === "BANK"
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                    data-testid="button-payment-bank"
                  >
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Building size={18} className="text-cyan-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">Bank Transfer</p>
                      <p className="text-xs text-muted-foreground">Direct bank deposit</p>
                    </div>
                    {paymentMethod === "BANK" && <Check size={20} className="ml-auto text-cyan-400" />}
                  </button>

                  <button
                    onClick={() => setPaymentMethod("PAYPAL")}
                    className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                      paymentMethod === "PAYPAL"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                    data-testid="button-payment-paypal"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <SiPaypal size={18} className="text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">PayPal</p>
                      <p className="text-xs text-muted-foreground">Pay with PayPal or card</p>
                    </div>
                    {paymentMethod === "PAYPAL" && <Check size={20} className="ml-auto text-blue-400" />}
                  </button>
                </div>

                {paymentMethod === "MPESA" && (
                  <div className="mt-4">
                    <GlassInput
                      label="M-Pesa Phone Number"
                      placeholder="254712345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      icon={<Phone size={16} />}
                      data-testid="input-mpesa-phone"
                    />
                  </div>
                )}

                {paymentMethod === "BANK" && (
                  <div className="mt-4 p-4 rounded-lg bg-white/5 text-sm">
                    <p className="font-medium text-white mb-2">Bank Details:</p>
                    <p className="text-muted-foreground">Bank: Equity Bank Kenya</p>
                    <p className="text-muted-foreground">Account: 0123456789012</p>
                    <p className="text-muted-foreground">Name: MnetiFi Limited</p>
                    <p className="text-xs text-cyan-400 mt-2">Upload proof of payment after transfer</p>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="text-2xl font-bold text-white">
                      Ksh {pricingTiers[selectedDuration].price.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    onClick={handleUpgrade}
                    disabled={isLoading || !paymentMethod}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    data-testid="button-upgrade"
                  >
                    {isLoading ? "Processing..." : "Upgrade Now"}
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
