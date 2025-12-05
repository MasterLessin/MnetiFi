import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowRight, ArrowLeft, Check, KeyRound, ShieldCheck } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function SuperAdminForgotPasswordPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<'request' | 'sent'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('sent');
        toast({
          title: "Reset link sent",
          description: "Check your email for password reset instructions",
        });
      } else {
        toast({
          title: "Request Failed",
          description: data.error || "Unable to process request",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Request Failed",
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
                <Badge variant="outline" className="bg-pink-500/20 text-pink-400 border-0">
                  <ShieldCheck size={12} className="mr-1" />
                  Platform Administration
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {step === 'request' ? 'Super Admin Password Reset' : 'Check Your Email'}
              </h1>
              <p className="text-muted-foreground">
                {step === 'request' 
                  ? 'Enter your Super Admin email to receive a reset link' 
                  : 'We sent you password reset instructions'}
              </p>
            </div>

            {step === 'request' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <GlassInput
                  label="Email Address"
                  type="email"
                  placeholder="Enter your Super Admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  icon={<Mail size={16} />}
                  data-testid="input-superadmin-email"
                />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  disabled={isLoading}
                  data-testid="button-send-reset"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight size={18} className="ml-2" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-pink-500/20 flex items-center justify-center">
                  <Check size={32} className="text-pink-400" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-white/80">
                    We sent a password reset link to:
                  </p>
                  <p className="text-pink-400 font-medium">
                    {email}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/5 text-left">
                  <p className="text-sm text-muted-foreground">
                    <KeyRound size={14} className="inline mr-2" />
                    The link will expire in 1 hour. If you don't see the email, check your spam folder.
                  </p>
                </div>

                <Button
                  onClick={() => { setStep('request'); setEmail(''); }}
                  variant="outline"
                  className="w-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                  data-testid="button-try-again"
                >
                  <ArrowLeft size={18} className="mr-2" />
                  Try a different email
                </Button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link 
                  href="/superadmin/login" 
                  className="text-pink-400 hover:text-pink-300 transition-colors font-medium"
                  data-testid="link-superadmin-login"
                >
                  Back to Super Admin login
                </Link>
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-muted-foreground">
                ISP Administrator?{" "}
                <Link 
                  href="/forgot-password" 
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                >
                  ISP Password Reset
                </Link>
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </>
  );
}
