import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Phone, Loader2, CheckCircle, XCircle, ArrowRight, Wifi, Ticket, CreditCard } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo, MpesaLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { PhoneInput, GlassInput } from "@/components/glass-input";
import { PlanCard, PlanCardSkeleton } from "@/components/plan-card";
import { WalledGardenFooter } from "@/components/walled-garden";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Plan, WalledGarden, Transaction, Tenant } from "@shared/schema";

type PaymentStep = "select-plan" | "enter-phone" | "enter-voucher" | "lookup-vouchers" | "processing" | "success" | "failed" | "voucher-success";

interface BrandingConfig {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface VoucherRedemptionResult {
  success: boolean;
  message: string;
  plan: {
    name: string;
    durationSeconds: number;
  };
  expiresAt: string;
  credentials?: {
    username: string;
    password: string;
  };
  autoLoginUrl: string | null;
  hotspotName: string | null;
}

interface VoucherLookupResult {
  id: string;
  code: string;
  planName: string | null;
  status: string;
  expiresAt: string | null;
  usedAt: string | null;
}

interface WiFiCredentials {
  username: string;
  password: string | null;
  expiresAt: string | null;
  planName: string;
  planDuration: number | null;
  autoLoginUrl: string | null;
  hotspotName: string | null;
}

export default function CaptivePortal() {
  const { toast } = useToast();
  const [step, setStep] = useState<PaymentStep>("select-plan");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [voucherResult, setVoucherResult] = useState<VoucherRedemptionResult | null>(null);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookedUpVouchers, setLookedUpVouchers] = useState<VoucherLookupResult[]>([]);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [credentials, setCredentials] = useState<WiFiCredentials | null>(null);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/portal/tenant"],
  });

  const branding: BrandingConfig = useMemo(() => {
    const config = tenant?.brandingConfig || {};
    return {
      logo: config.logo || "",
      primaryColor: config.primaryColor || "#22d3ee",
      secondaryColor: config.secondaryColor || "#a855f7",
    };
  }, [tenant]);

  const gradientStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
  }), [branding]);

  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: walledGardens } = useQuery<WalledGarden[]>({
    queryKey: ["/api/walled-gardens"],
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: { planId: string; phone: string }) => {
      const response = await apiRequest("POST", "/api/transactions/initiate", data);
      return await response.json() as Transaction;
    },
    onSuccess: (data) => {
      setTransaction(data);
      setStep("processing");
      pollTransactionStatus(data.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Unable to initiate payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const voucherMutation = useMutation({
    mutationFn: async (data: { code: string; phoneNumber: string }) => {
      const response = await apiRequest("POST", "/api/portal/redeem-voucher", data);
      return await response.json() as VoucherRedemptionResult;
    },
    onSuccess: (data) => {
      setVoucherResult(data);
      setStep("voucher-success");
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid Voucher",
        description: error.message || "Unable to redeem voucher. Please check the code and try again.",
        variant: "destructive",
      });
    },
  });

  const fetchCredentials = async (transactionId: string) => {
    setIsLoadingCredentials(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}/credentials`);
      if (response.ok) {
        const creds = await response.json() as WiFiCredentials;
        setCredentials(creds);
      }
    } catch (error) {
      console.error("Failed to fetch credentials:", error);
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const pollTransactionStatus = async (transactionId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setStep("failed");
        return;
      }

      try {
        const response = await fetch(`/api/transactions/${transactionId}`);
        const data = await response.json() as Transaction;

        if (data.status === "COMPLETED") {
          setTransaction(data);
          setStep("success");
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
          // Fetch WiFi credentials for auto-connect
          await fetchCredentials(transactionId);
          return;
        } else if (data.status === "FAILED") {
          setTransaction(data);
          setStep("failed");
          return;
        }

        attempts++;
        setTimeout(poll, 3000);
      } catch {
        attempts++;
        setTimeout(poll, 3000);
      }
    };

    poll();
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep("enter-phone");
  };

  const handlePhoneSubmit = () => {
    if (!selectedPlan) return;

    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith("0")) {
      formattedPhone = "254" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("254")) {
      formattedPhone = "254" + cleanPhone;
    }

    paymentMutation.mutate({
      planId: selectedPlan.id,
      phone: formattedPhone,
    });
  };

  const handleVoucherSubmit = () => {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith("0")) {
      formattedPhone = "254" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("254")) {
      formattedPhone = "254" + cleanPhone;
    }

    if (!voucherCode.trim()) {
      toast({
        title: "Missing Voucher Code",
        description: "Please enter a voucher code",
        variant: "destructive",
      });
      return;
    }

    voucherMutation.mutate({
      code: voucherCode.trim().toUpperCase(),
      phoneNumber: formattedPhone,
    });
  };

  const handleLookupVouchers = async () => {
    const cleanPhone = lookupPhone.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith("0")) {
      formattedPhone = "254" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("254")) {
      formattedPhone = "254" + cleanPhone;
    }

    setIsLookingUp(true);
    try {
      const response = await fetch(`/api/portal/vouchers?phone=${formattedPhone}`);
      const data = await response.json() as VoucherLookupResult[];
      setLookedUpVouchers(data);
      if (data.length === 0) {
        toast({
          title: "No Vouchers Found",
          description: "No vouchers found for this phone number. You can purchase a plan or enter a voucher code.",
        });
      }
    } catch {
      toast({
        title: "Lookup Failed",
        description: "Unable to lookup vouchers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleRetry = () => {
    setStep("select-plan");
    setSelectedPlan(null);
    setPhoneNumber("");
    setVoucherCode("");
    setTransaction(null);
    setVoucherResult(null);
    setLookupPhone("");
    setLookedUpVouchers([]);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  const BrandedLogo = () => {
    if (branding.logo) {
      return (
        <img
          src={branding.logo}
          alt={tenant?.name || "Logo"}
          className="h-12 mx-auto object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    
    if (tenant?.name) {
      return (
        <div className="flex items-center justify-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${branding.primaryColor}20` }}
          >
            <Wifi size={24} style={{ color: branding.primaryColor }} />
          </div>
          <span
            className="text-2xl font-bold"
            style={{
              background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {tenant.name}
          </span>
        </div>
      );
    }

    return <MnetiFiLogo size="lg" className="justify-center" />;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <MeshBackground />

      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GlassPanel size="lg" className="relative">
          <div className="text-center mb-8">
            <BrandedLogo />
            <p className="mt-2 text-muted-foreground text-sm">
              Connect to Wi-Fi
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === "select-plan" && (
              <motion.div
                key="select-plan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <h2 className="text-lg font-semibold text-white">
                    Choose Your Plan
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPlan(null);
                      setStep("enter-voucher");
                    }}
                    className="gap-1"
                    data-testid="button-have-voucher"
                  >
                    <Ticket size={16} />
                    Have a Voucher?
                  </Button>
                </div>

                {plansLoading ? (
                  <div className="space-y-4">
                    <PlanCardSkeleton />
                    <PlanCardSkeleton />
                  </div>
                ) : plans && plans.length > 0 ? (
                  <div className="space-y-4" data-testid="plan-list">
                    {plans.filter(p => p.isActive).map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        onSelect={handlePlanSelect}
                        showDetails={false}
                        brandingColor={{ primary: branding.primaryColor, secondary: branding.secondaryColor }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No plans available</p>
                  </div>
                )}

                <div className="text-center pt-4 border-t border-white/10 mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Already purchased?
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => setStep("lookup-vouchers")}
                    className="text-sm"
                    style={{ color: branding.primaryColor }}
                    data-testid="button-find-vouchers"
                  >
                    <Phone size={16} className="mr-1" />
                    Find My Vouchers
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "enter-phone" && selectedPlan && (
              <motion.div
                key="enter-phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Selected Plan</span>
                      <h3 className="text-lg font-semibold text-white">{selectedPlan.name}</h3>
                    </div>
                    <span
                      className="text-2xl font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {formatPrice(selectedPlan.price)}
                    </span>
                  </div>
                </div>

                <div>
                  <PhoneInput
                    label="M-Pesa Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    data-testid="input-phone"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    You will receive an M-Pesa prompt on this number
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setStep("select-plan")}
                    className="flex-1"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 mpesa-btn"
                    onClick={handlePhoneSubmit}
                    disabled={paymentMutation.isPending}
                    data-testid="button-pay"
                  >
                    <MpesaLogo size={20} />
                    <span className="ml-2">Pay with M-Pesa</span>
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "enter-voucher" && (
              <motion.div
                key="enter-voucher"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${branding.primaryColor}20` }}
                  >
                    <Ticket size={32} style={{ color: branding.primaryColor }} />
                  </div>
                  <h2 className="text-lg font-semibold text-white mb-1">
                    Redeem Voucher
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your voucher code to connect
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">Voucher Code</label>
                    <GlassInput
                      placeholder="Enter voucher code (e.g., WIFI-XXXXXXXX)"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      className="text-center font-mono text-lg tracking-wider"
                      data-testid="input-voucher-code"
                    />
                  </div>

                  <div>
                    <PhoneInput
                      label="Your Phone Number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      data-testid="input-voucher-phone"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      This number will be linked to your account
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setVoucherCode("");
                      setStep("select-plan");
                    }}
                    className="flex-1"
                    data-testid="button-voucher-back"
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    style={gradientStyle}
                    onClick={handleVoucherSubmit}
                    disabled={voucherMutation.isPending}
                    data-testid="button-redeem-voucher"
                  >
                    {voucherMutation.isPending ? (
                      <Loader2 size={18} className="animate-spin mr-2" />
                    ) : (
                      <Ticket size={18} className="mr-2" />
                    )}
                    Redeem Voucher
                  </Button>
                </div>

                <div className="text-center pt-4 border-t border-white/10">
                  <p className="text-sm text-muted-foreground mb-2">
                    Don't have a voucher?
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => setStep("select-plan")}
                    className="text-sm"
                    style={{ color: branding.primaryColor }}
                    data-testid="button-buy-plan"
                  >
                    <CreditCard size={16} className="mr-1" />
                    Buy a plan with M-Pesa
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "lookup-vouchers" && (
              <motion.div
                key="lookup-vouchers"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${branding.primaryColor}20` }}
                  >
                    <Phone size={32} style={{ color: branding.primaryColor }} />
                  </div>
                  <h2 className="text-lg font-semibold text-white mb-1">
                    Find My Vouchers
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your phone number to find your existing vouchers
                  </p>
                </div>

                <div>
                  <PhoneInput
                    label="Phone Number"
                    value={lookupPhone}
                    onChange={(e) => setLookupPhone(e.target.value)}
                    data-testid="input-lookup-phone"
                  />
                </div>

                <Button
                  className="w-full"
                  style={gradientStyle}
                  onClick={handleLookupVouchers}
                  disabled={isLookingUp}
                  data-testid="button-lookup"
                >
                  {isLookingUp ? (
                    <Loader2 size={18} className="animate-spin mr-2" />
                  ) : (
                    <Phone size={18} className="mr-2" />
                  )}
                  Find Vouchers
                </Button>

                {lookedUpVouchers.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">Your Vouchers</h3>
                    {lookedUpVouchers.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-sm text-white">{v.code}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              v.status === "USED"
                                ? "bg-green-500/20 text-green-400"
                                : v.status === "EXPIRED"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {v.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {v.planName && <p>Plan: {v.planName}</p>}
                          {v.expiresAt && (
                            <p>Expires: {new Date(v.expiresAt).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setLookupPhone("");
                      setLookedUpVouchers([]);
                      setStep("select-plan");
                    }}
                    className="flex-1"
                    data-testid="button-lookup-back"
                  >
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep("enter-voucher")}
                    className="flex-1"
                    data-testid="button-enter-code"
                  >
                    <Ticket size={16} className="mr-1" />
                    Enter Code
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                  style={gradientStyle}
                >
                  <Loader2 size={32} className="text-white" />
                </motion.div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Processing Payment
                </h3>
                <p className="text-muted-foreground">
                  Please check your phone for the M-Pesa prompt
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Enter your PIN to complete the payment
                </p>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${branding.primaryColor}20` }}
                >
                  <CheckCircle size={40} style={{ color: branding.primaryColor }} />
                </motion.div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Payment Successful
                </h3>
                <p className="text-muted-foreground mb-4">
                  {credentials ? "Your WiFi credentials are ready" : "You are now connected to the internet"}
                </p>

                {isLoadingCredentials ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Loading credentials...</span>
                  </div>
                ) : credentials ? (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4 text-left">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Username:</span>
                        <span className="font-mono font-medium text-white" data-testid="text-username">{credentials.username}</span>
                      </div>
                      {credentials.password && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Password:</span>
                          <span className="font-mono font-medium text-white" data-testid="text-password">{credentials.password}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Plan:</span>
                        <span className="font-medium text-white">{credentials.planName}</span>
                      </div>
                      {credentials.expiresAt && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Expires:</span>
                          <span className="font-medium text-white">
                            {new Date(credentials.expiresAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {credentials.hotspotName && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Hotspot:</span>
                          <span className="font-medium text-white">{credentials.hotspotName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {transaction?.mpesaReceiptNumber && (
                  <p className="text-xs text-muted-foreground font-mono mb-4">
                    Receipt: {transaction.mpesaReceiptNumber}
                  </p>
                )}

                {credentials?.autoLoginUrl ? (
                  <Button
                    className="w-full"
                    style={gradientStyle}
                    onClick={() => {
                      window.location.href = credentials.autoLoginUrl!;
                    }}
                    data-testid="button-auto-connect"
                  >
                    <Wifi size={16} className="mr-2" />
                    Connect Now
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    style={gradientStyle}
                    data-testid="button-browse"
                  >
                    Start Browsing
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                )}
              </motion.div>
            )}

            {step === "voucher-success" && voucherResult && (
              <motion.div
                key="voucher-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${branding.primaryColor}20` }}
                >
                  <CheckCircle size={40} style={{ color: branding.primaryColor }} />
                </motion.div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Voucher Redeemed
                </h3>
                <p className="text-muted-foreground mb-4">
                  {voucherResult.credentials ? "Your WiFi credentials are ready" : "You are now connected to the internet"}
                </p>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6 text-left">
                  <div className="space-y-3 text-sm">
                    {voucherResult.credentials && (
                      <>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Username:</span>
                          <span className="font-mono font-medium text-white" data-testid="text-voucher-username">{voucherResult.credentials.username}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Password:</span>
                          <span className="font-mono font-medium text-white" data-testid="text-voucher-password">{voucherResult.credentials.password}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Plan:</span>
                      <span className="font-medium text-white">{voucherResult.plan.name}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium text-white">{formatDuration(voucherResult.plan.durationSeconds)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium text-white">
                        {new Date(voucherResult.expiresAt).toLocaleString()}
                      </span>
                    </div>
                    {voucherResult.hotspotName && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Hotspot:</span>
                        <span className="font-medium text-white">{voucherResult.hotspotName}</span>
                      </div>
                    )}
                  </div>
                </div>
                {voucherResult.autoLoginUrl ? (
                  <Button
                    className="w-full"
                    style={gradientStyle}
                    onClick={() => {
                      window.location.href = voucherResult.autoLoginUrl!;
                    }}
                    data-testid="button-voucher-auto-connect"
                  >
                    <Wifi size={16} className="mr-2" />
                    Connect Now
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    style={gradientStyle}
                    data-testid="button-browse-voucher"
                  >
                    Start Browsing
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                )}
              </motion.div>
            )}

            {step === "failed" && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="w-16 h-16 mx-auto mb-6 rounded-full bg-pink-500/20 flex items-center justify-center"
                >
                  <XCircle size={40} className="text-pink-400" />
                </motion.div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Payment Failed
                </h3>
                <p className="text-muted-foreground mb-6">
                  {transaction?.statusDescription || "The payment could not be completed"}
                </p>
                <Button
                  onClick={handleRetry}
                  style={gradientStyle}
                  data-testid="button-retry"
                >
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {walledGardens && walledGardens.length > 0 && step === "select-plan" && (
            <WalledGardenFooter domains={walledGardens} />
          )}
        </GlassPanel>

        <p className="text-center mt-6 text-xs text-muted-foreground">
          Powered by <span className="gradient-text font-semibold">MnetiFi</span>
        </p>
      </motion.div>
    </div>
  );
}
