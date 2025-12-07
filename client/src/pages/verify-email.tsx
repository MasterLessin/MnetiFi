import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Mail, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setIsVerifying(false);
        setError("No verification token provided");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setIsVerified(true);
          toast({
            title: "Email Verified",
            description: "Your email has been verified successfully. You can now log in.",
          });
        } else {
          setError(data.error || "Verification failed");
        }
      } catch (err) {
        setError("Unable to connect to server");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [toast]);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resendEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Verification Email Sent",
          description: "If the email exists, a new verification link has been sent.",
        });
        setResendEmail("");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to resend verification email",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
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
              <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-0 mb-4">
                <Mail size={12} className="mr-1" />
                Email Verification
              </Badge>
            </div>

            {isVerifying ? (
              <div className="py-8">
                <Loader2 size={48} className="mx-auto text-cyan-400 animate-spin mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Verifying your email...</h2>
                <p className="text-muted-foreground">Please wait while we verify your email address.</p>
              </div>
            ) : isVerified ? (
              <div className="py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Email Verified!</h2>
                <p className="text-muted-foreground mb-6">
                  Your email has been verified successfully. You can now log in to your account.
                </p>
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full gradient-btn"
                  data-testid="button-go-to-login"
                >
                  Go to Login
                </Button>
              </div>
            ) : (
              <div className="py-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle size={32} className="text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Verification Failed</h2>
                <p className="text-muted-foreground mb-6">{error}</p>

                <div className="border-t border-white/10 pt-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Need a new verification link? Enter your email below:
                  </p>
                  <form onSubmit={handleResendVerification} className="space-y-4">
                    <GlassInput
                      label="Email Address"
                      type="email"
                      placeholder="your@email.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      icon={<Mail size={16} />}
                      data-testid="input-resend-email"
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      variant="outline"
                      disabled={isResending}
                      data-testid="button-resend-verification"
                    >
                      {isResending ? (
                        <>
                          <Loader2 size={18} className="mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={18} className="mr-2" />
                          Resend Verification Email
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-muted-foreground">
                Already verified?{" "}
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
