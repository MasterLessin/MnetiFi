import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { User, Lock, Mail, Building2, Loader2, ArrowRight, ArrowLeft, Check, Wifi, CreditCard, Building, Phone, X, Crown, Zap, Shield, Users } from "lucide-react";
import { SiPaypal } from "react-icons/si";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo, MpesaLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

function checkPasswordStrength(password: string): PasswordStrength {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(requirements).filter(Boolean).length;

  let label = "Very Weak";
  let color = "bg-red-500";

  if (score === 5) {
    label = "Strong";
    color = "bg-green-500";
  } else if (score === 4) {
    label = "Good";
    color = "bg-cyan-500";
  } else if (score === 3) {
    label = "Fair";
    color = "bg-yellow-500";
  } else if (score === 2) {
    label = "Weak";
    color = "bg-orange-500";
  }

  return { score, label, color, requirements };
}

type SubscriptionTier = "BASIC" | "PREMIUM" | null;
type PaymentMethod = "MPESA" | "BANK" | "PAYPAL" | null;

const tierFeatures = {
  BASIC: [
    "Hotspot User Management",
    "Hotspot Plan Management",
    "Transaction History",
    "Walled Garden Config",
    "Basic Dashboard",
    "Captive Portal",
  ],
  PREMIUM: [
    "Everything in Basic, plus:",
    "PPPoE User Management",
    "Static IP Management",
    "Technician Accounts",
    "SMS Campaigns",
    "Customer Chat",
    "Loyalty Points System",
    "Advanced Reports",
    "Priority Support",
  ],
};

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
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [phoneNumber, setPhoneNumber] = useState("");

  const passwordStrength = useMemo(() => checkPasswordStrength(password), [password]);

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
    const { requirements } = passwordStrength;
    if (!requirements.minLength || !requirements.hasUppercase || !requirements.hasLowercase || !requirements.hasNumber || !requirements.hasSpecial) {
      toast({
        title: "Password too weak",
        description: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
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
    if (!selectedTier) {
      toast({
        title: "Plan required",
        description: "Please select a subscription plan",
        variant: "destructive",
      });
      return false;
    }
    if (selectedTier === "PREMIUM") {
      if (!paymentMethod) {
        toast({
          title: "Payment method required",
          description: "Please select a payment method for the premium plan",
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
          subscriptionTier: selectedTier,
          paymentMethod: selectedTier === "PREMIUM" ? paymentMethod : undefined,
          phoneNumber: selectedTier === "PREMIUM" && paymentMethod === "MPESA" ? phoneNumber : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (selectedTier === "BASIC") {
          localStorage.setItem("admin_session", JSON.stringify({
            user: data.user,
            lastActivity: new Date().toISOString(),
          }));
          toast({
            title: "Welcome to MnetiFi!",
            description: "Your 24-hour free trial has started. Enjoy exploring!",
          });
          setLocation("/dashboard");
        } else if (data.requiresEmailVerification) {
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
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-medium">3.</span>
                    Complete your premium subscription payment
                  </li>
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
          className="w-full max-w-2xl"
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
                {step === 3 ? "Choose your plan" : "Start your 24-hour free trial"}
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
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4 max-w-md mx-auto">
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
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4 max-w-md mx-auto">
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
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  icon={<Lock size={16} />}
                  data-testid="input-password"
                />
                
                {password && (
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Password strength:</span>
                      <span className={`font-medium ${
                        passwordStrength.score >= 4 ? 'text-green-400' : 
                        passwordStrength.score >= 3 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <Progress 
                      value={(passwordStrength.score / 5) * 100} 
                      className="h-1.5"
                    />
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.minLength ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.minLength ? <Check size={12} /> : <X size={12} />}
                        8+ characters
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.hasUppercase ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.hasUppercase ? <Check size={12} /> : <X size={12} />}
                        Uppercase
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.hasLowercase ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.hasLowercase ? <Check size={12} /> : <X size={12} />}
                        Lowercase
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.hasNumber ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.hasNumber ? <Check size={12} /> : <X size={12} />}
                        Number
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.hasSpecial ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.hasSpecial ? <Check size={12} /> : <X size={12} />}
                        Special char
                      </div>
                    </div>
                  </div>
                )}

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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTier("BASIC");
                      setPaymentMethod(null);
                    }}
                    className={`p-6 rounded-xl border transition-all text-left ${
                      selectedTier === "BASIC"
                        ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                    data-testid="button-tier-basic"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Zap size={24} className="text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">Basic</h3>
                        <Badge className="bg-green-500/20 text-green-400 border-0">
                          Free 24hr Trial
                        </Badge>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-2xl font-bold text-white">Ksh 0</p>
                      <p className="text-xs text-muted-foreground">for 24 hours</p>
                    </div>
                    <ul className="space-y-2">
                      {tierFeatures.BASIC.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check size={14} className="text-cyan-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {selectedTier === "BASIC" && (
                      <div className="mt-4 p-3 rounded-lg bg-cyan-500/20 text-center">
                        <Check size={20} className="text-cyan-400 mx-auto" />
                        <p className="text-sm text-cyan-400 font-medium">Selected</p>
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTier("PREMIUM")}
                    className={`p-6 rounded-xl border transition-all text-left relative ${
                      selectedTier === "PREMIUM"
                        ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                    data-testid="button-tier-premium"
                  >
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                        <Crown size={12} className="mr-1" />
                        Recommended
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Crown size={24} className="text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">Premium</h3>
                        <Badge className="bg-purple-500/20 text-purple-400 border-0">
                          Full Access
                        </Badge>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-2xl font-bold text-white">Ksh 2,500</p>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                    <ul className="space-y-2">
                      {tierFeatures.PREMIUM.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check size={14} className="text-purple-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {selectedTier === "PREMIUM" && (
                      <div className="mt-4 p-3 rounded-lg bg-purple-500/20 text-center">
                        <Check size={20} className="text-purple-400 mx-auto" />
                        <p className="text-sm text-purple-400 font-medium">Selected</p>
                      </div>
                    )}
                  </button>
                </div>

                {selectedTier === "PREMIUM" && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <p className="text-sm text-muted-foreground">
                      Choose your payment method:
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
                    </div>

                    {paymentMethod === "MPESA" && (
                      <GlassInput
                        label="M-Pesa Phone Number"
                        placeholder="254712345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        required
                        icon={<Phone size={16} />}
                        data-testid="input-phone-number"
                      />
                    )}
                  </div>
                )}

                <div className="flex gap-3 max-w-md mx-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-white/20"
                    onClick={() => setStep(2)}
                    data-testid="button-back-step3"
                  >
                    <ArrowLeft size={18} className="mr-2" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className={`flex-1 ${
                      selectedTier === "PREMIUM" 
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" 
                        : "gradient-btn"
                    }`}
                    disabled={isLoading || !selectedTier}
                    data-testid="button-create-account"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        {selectedTier === "BASIC" ? "Start Free Trial" : "Create Account"}
                        <ArrowRight size={18} className="ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-white/10 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link 
                  href="/login" 
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                  data-testid="link-login"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </>
  );
}
