import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { User, Lock, Mail, Building2, Loader2, ArrowRight, ArrowLeft, Check, Wifi, CreditCard, Building, Phone } from "lucide-react";
import { SiPaypal } from "react-icons/si";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo, MpesaLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type PaymentMethod = "MPESA" | "BANK" | "PAYPAL" | null;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  
  const [businessName, setBusinessName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [phoneNumber, setPhoneNumber] = useState("");

  const validateStep1 = () => {
    if (!businessName.trim()) {
      toast({
        title: "Business name required",
        description: "Please enter your ISP business name",
        variant: "destructive",
      });
      return false;
    }
    if (!subdomain.trim()) {
      toast({
        title: "Subdomain required",
        description: "Please choose a subdomain for your portal",
        variant: "destructive",
      });
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      toast({
        title: "Invalid subdomain",
        description: "Subdomain can only contain lowercase letters, numbers, and hyphens",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username",
        variant: "destructive",
      });
      return false;
    }
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return false;
    }
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!paymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return false;
    }
    if (paymentMethod === "MPESA" && !phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your M-Pesa phone number",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep3()) return;
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          subdomain,
          username,
          email,
          password,
          paymentMethod,
          phoneNumber: paymentMethod === "MPESA" ? phoneNumber : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresEmailVerification) {
          setRegistrationComplete(true);
        } else {
          toast({
            title: "Account Created!",
            description: "You can now log in to your account.",
          });
          setLocation("/login");
        }
      } else {
        toast({
          title: "Registration Failed",
          description: data.error || "Unable to create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationComplete) {
    return (
      <>
        <MeshBackground />
        <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <GlassPanel size="lg" className="text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Mail size={40} className="text-cyan-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-verify-title">
                  Verify Your Email
                </h1>
                <p className="text-muted-foreground mb-4">
                  We've sent a verification link to:
                </p>
                <p className="text-cyan-400 font-medium mb-6" data-testid="text-email-sent">
                  {email}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6 text-left">
                <h3 className="font-medium text-white mb-2">Next Steps:</h3>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-medium">1.</span>
                    Check your inbox for the verification email
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-medium">2.</span>
                    Click the verification link to activate your account
                  </li>
                  {paymentMethod === "MPESA" && (
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-medium">3.</span>
                      After verification, you'll receive an M-Pesa payment prompt
                    </li>
                  )}
                  {paymentMethod === "PAYPAL" && (
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-medium">3.</span>
                      After verification, you'll be redirected to PayPal
                    </li>
                  )}
                  {paymentMethod === "BANK" && (
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-medium">3.</span>
                      After verification, complete bank transfer to activate
                    </li>
                  )}
                </ol>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Didn't receive the email? Check your spam folder or{" "}
                <button 
                  className="text-cyan-400 hover:underline"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/auth/resend-verification", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email }),
                      });
                      if (res.ok) {
                        toast({ title: "Verification email resent!", description: "Check your inbox" });
                      } else {
                        const data = await res.json();
                        toast({ title: "Error", description: data.error, variant: "destructive" });
                      }
                    } catch {
                      toast({ title: "Error", description: "Failed to resend email", variant: "destructive" });
                    }
                  }}
                  data-testid="button-resend-verification"
                >
                  click here to resend
                </button>
              </p>

              <Link href="/login">
                <Button variant="outline" className="w-full border-white/20" data-testid="link-back-to-login">
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Login
                </Button>
              </Link>
            </GlassPanel>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <MeshBackground />
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <GlassPanel size="lg" className="text-center">
            <div className="mb-8">
              <MnetiFiLogo size="lg" className="mx-auto mb-4" />
              <div className="flex items-center justify-center gap-2 mb-2">
                <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-0">
                  <Wifi size={12} className="mr-1" />
                  ISP Registration
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Register Your ISP Business</h1>
              <p className="text-muted-foreground">
                Start your 24-hour free trial
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-cyan-500 text-white' : 'bg-white/10 text-muted-foreground'
              }`}>
                {step > 1 ? <Check size={16} /> : '1'}
              </div>
              <div className={`w-8 h-0.5 ${step > 1 ? 'bg-cyan-500' : 'bg-white/10'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-cyan-500 text-white' : 'bg-white/10 text-muted-foreground'
              }`}>
                {step > 2 ? <Check size={16} /> : '2'}
              </div>
              <div className={`w-8 h-0.5 ${step > 2 ? 'bg-cyan-500' : 'bg-white/10'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3 ? 'bg-cyan-500 text-white' : 'bg-white/10 text-muted-foreground'
              }`}>
                3
              </div>
            </div>

            {step === 1 ? (
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
                <GlassInput
                  label="Business Name"
                  placeholder="Your ISP business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  icon={<Building2 size={16} />}
                  data-testid="input-business-name"
                />

                <div className="space-y-2">
                  <GlassInput
                    label="Subdomain"
                    placeholder="your-isp"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    required
                    data-testid="input-subdomain"
                  />
                  <p className="text-xs text-muted-foreground text-left">
                    Your portal will be: <span className="text-cyan-400">{subdomain || 'your-isp'}.mnetifi.com</span>
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-btn"
                  data-testid="button-next"
                >
                  Next Step
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </form>
            ) : step === 2 ? (
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
                <GlassInput
                  label="Admin Username"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  icon={<User size={16} />}
                  data-testid="input-username"
                />

                <GlassInput
                  label="Email Address"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  icon={<Mail size={16} />}
                  data-testid="input-email"
                />

                <GlassInput
                  label="Password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  icon={<Lock size={16} />}
                  data-testid="input-password"
                />

                <GlassInput
                  label="Confirm Password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  icon={<Lock size={16} />}
                  data-testid="input-confirm-password"
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-white/20"
                    onClick={() => setStep(1)}
                    data-testid="button-back"
                  >
                    <ArrowLeft size={18} className="mr-2" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gradient-btn"
                    data-testid="button-next-step2"
                  >
                    Next Step
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-left mb-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose your preferred payment method for registration:
                  </p>
                  
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("MPESA")}
                      className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${
                        paymentMethod === "MPESA"
                          ? "border-green-500 bg-green-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                      data-testid="button-payment-mpesa"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <MpesaLogo size={24} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-white">M-Pesa</p>
                        <p className="text-xs text-muted-foreground">Pay instantly via STK Push</p>
                      </div>
                      {paymentMethod === "MPESA" && (
                        <Check size={20} className="text-green-400" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("BANK")}
                      className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${
                        paymentMethod === "BANK"
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                      data-testid="button-payment-bank"
                    >
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Building size={20} className="text-cyan-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-white">Bank Transfer</p>
                        <p className="text-xs text-muted-foreground">Pay via bank deposit</p>
                      </div>
                      {paymentMethod === "BANK" && (
                        <Check size={20} className="text-cyan-400" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("PAYPAL")}
                      className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${
                        paymentMethod === "PAYPAL"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                      data-testid="button-payment-paypal"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <SiPaypal size={20} className="text-blue-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-white">PayPal</p>
                        <p className="text-xs text-muted-foreground">Pay with PayPal account</p>
                      </div>
                      {paymentMethod === "PAYPAL" && (
                        <Check size={20} className="text-blue-400" />
                      )}
                    </button>
                  </div>
                </div>

                {paymentMethod === "MPESA" && (
                  <GlassInput
                    label="M-Pesa Phone Number"
                    placeholder="0712345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    icon={<Phone size={16} />}
                    data-testid="input-phone"
                  />
                )}

                {paymentMethod === "BANK" && (
                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-left">
                    <p className="text-sm font-medium text-white mb-2">Bank Details</p>
                    <p className="text-xs text-muted-foreground">
                      Bank: Kenya Commercial Bank<br />
                      Account: 1234567890<br />
                      Name: MnetiFi Ltd<br />
                      Branch: Nairobi
                    </p>
                  </div>
                )}

                {paymentMethod === "PAYPAL" && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left">
                    <p className="text-sm font-medium text-white mb-2">PayPal Payment</p>
                    <p className="text-xs text-muted-foreground">
                      You will be redirected to PayPal to complete payment after registration.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-white/20"
                    onClick={() => setStep(2)}
                    data-testid="button-back"
                  >
                    <ArrowLeft size={18} className="mr-2" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gradient-btn"
                    disabled={isLoading || !paymentMethod}
                    data-testid="button-register"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <ArrowRight size={18} className="ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-muted-foreground">
                Already have an ISP account?{" "}
                <Link 
                  href="/login" 
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                  data-testid="link-login"
                >
                  Sign in here
                </Link>
              </p>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-white/5 text-left">
              <p className="text-xs text-muted-foreground mb-2">Pricing after trial:</p>
              <div className="space-y-1 text-xs">
                <p className="text-white/80">
                  <span className="text-cyan-400">Tier 1:</span> Ksh 500/month (Hotspot OR PPPoE)
                </p>
                <p className="text-white/80">
                  <span className="text-cyan-400">Tier 2:</span> Ksh 1,500/month (All features)
                </p>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </>
  );
}
