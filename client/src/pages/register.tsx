import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { User, Lock, Mail, Building2, Loader2, ArrowRight, ArrowLeft, Check, Wifi } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [businessName, setBusinessName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    
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
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Account Created!",
          description: "Your ISP account has been created. You can now login.",
        });
        setLocation("/login");
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
              <div className={`w-12 h-0.5 ${step > 1 ? 'bg-cyan-500' : 'bg-white/10'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-cyan-500 text-white' : 'bg-white/10 text-muted-foreground'
              }`}>
                2
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
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    disabled={isLoading}
                    data-testid="button-register"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Account
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
