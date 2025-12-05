import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowRight, ArrowLeft, Check, KeyRound } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
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
              <h1 className="text-2xl font-bold text-white mb-2">
                {step === 'request' ? 'Reset Password' : 'Check Your Email'}
              </h1>
              <p className="text-muted-foreground">
                {step === 'request' 
                  ? 'Enter your email to receive a reset link' 
                  : 'We sent you password reset instructions'}
              </p>
            </div>

            {step === 'request' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <GlassInput
                  label="Email Address"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  icon={<Mail size={16} />}
                  data-testid="input-email"
                />

                <Button
                  type="submit"
                  className="w-full gradient-btn"
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
                <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Check size={32} className="text-cyan-400" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-white/80">
                    We sent a password reset link to:
                  </p>
                  <p className="text-cyan-400 font-medium">
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
                  className="w-full border-white/20"
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
                  href="/login" 
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                  data-testid="link-login"
                >
                  Back to login
                </Link>
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </>
  );
}
