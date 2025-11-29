import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Phone, Loader2, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo, MpesaLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { PhoneInput } from "@/components/glass-input";
import { PlanCard, PlanCardSkeleton } from "@/components/plan-card";
import { WalledGardenFooter } from "@/components/walled-garden";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Plan, WalledGarden, Transaction } from "@shared/schema";

type PaymentStep = "select-plan" | "enter-phone" | "processing" | "success" | "failed";

export default function CaptivePortal() {
  const { toast } = useToast();
  const [step, setStep] = useState<PaymentStep>("select-plan");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  // Fetch available plans
  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  // Fetch walled garden domains
  const { data: walledGardens } = useQuery<WalledGarden[]>({
    queryKey: ["/api/walled-gardens"],
  });

  // Initiate payment mutation
  const paymentMutation = useMutation({
    mutationFn: async (data: { planId: string; phone: string }) => {
      const response = await apiRequest("POST", "/api/transactions/initiate", data);
      return response as Transaction;
    },
    onSuccess: (data) => {
      setTransaction(data);
      setStep("processing");
      // Start polling for status
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

  // Poll transaction status
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

    // Validate phone number
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    // Format to international format
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

  const handleRetry = () => {
    setStep("select-plan");
    setSelectedPlan(null);
    setPhoneNumber("");
    setTransaction(null);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
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
          {/* Logo */}
          <div className="text-center mb-8">
            <MnetiFiLogo size="lg" className="justify-center" />
            <p className="mt-2 text-muted-foreground text-sm">
              Connect to Wi-Fi with M-Pesa
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Select Plan */}
            {step === "select-plan" && (
              <motion.div
                key="select-plan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-lg font-semibold text-white mb-4">
                  Choose Your Plan
                </h2>

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
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No plans available</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Enter Phone */}
            {step === "enter-phone" && selectedPlan && (
              <motion.div
                key="enter-phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Selected plan summary */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-muted-foreground">Selected Plan</span>
                      <h3 className="text-lg font-semibold text-white">{selectedPlan.name}</h3>
                    </div>
                    <span className="text-2xl font-bold gradient-text">
                      {formatPrice(selectedPlan.price)}
                    </span>
                  </div>
                </div>

                {/* Phone input */}
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

                {/* Action buttons */}
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

            {/* Step 3: Processing */}
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
                  className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center"
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

            {/* Step 4: Success */}
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
                  className="w-16 h-16 mx-auto mb-6 rounded-full bg-cyan-500/20 flex items-center justify-center"
                >
                  <CheckCircle size={40} className="text-cyan-400" />
                </motion.div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Payment Successful
                </h3>
                <p className="text-muted-foreground mb-6">
                  You are now connected to the internet
                </p>
                {transaction?.mpesaReceiptNumber && (
                  <p className="text-sm text-muted-foreground font-mono">
                    Receipt: {transaction.mpesaReceiptNumber}
                  </p>
                )}
                <Button className="mt-6 gradient-btn" data-testid="button-browse">
                  Start Browsing
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Step 5: Failed */}
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
                  className="gradient-btn"
                  data-testid="button-retry"
                >
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Walled Garden Footer */}
          {walledGardens && walledGardens.length > 0 && step === "select-plan" && (
            <WalledGardenFooter domains={walledGardens} />
          )}
        </GlassPanel>

        {/* Footer branding */}
        <p className="text-center mt-6 text-xs text-muted-foreground">
          Powered by <span className="gradient-text font-semibold">MnetiFi</span>
        </p>
      </motion.div>
    </div>
  );
}
