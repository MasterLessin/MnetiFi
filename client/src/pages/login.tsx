import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { User, Lock, Loader2, ArrowRight, Building2, Shield, ArrowLeft } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId2FA, setUserId2FA] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (session) {
      try {
        const sessionData = JSON.parse(session);
        const lastActivity = new Date(sessionData.lastActivity).getTime();
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        
        if (now - lastActivity < tenMinutes) {
          setLocation("/dashboard");
        } else {
          localStorage.removeItem("admin_session");
        }
      } catch {
        localStorage.removeItem("admin_session");
      }
    }
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if 2FA is required
        if (data.requiresTwoFactor) {
          setRequires2FA(true);
          setUserId2FA(data.userId);
          toast({
            title: "Two-Factor Authentication",
            description: "Please enter your authentication code",
          });
        } else {
          localStorage.setItem("admin_session", JSON.stringify({
            user: data.user,
            lastActivity: new Date().toISOString(),
          }));
          toast({
            title: "Welcome back!",
            description: `Logged in as ${data.user.username}`,
          });
          setLocation("/dashboard");
        }
      } else {
        toast({
          title: "Login Failed",
          description: data.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerify = async () => {
    if (twoFactorCode.length !== 6 || !userId2FA) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId2FA, code: twoFactorCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("admin_session", JSON.stringify({
          user: data.user,
          lastActivity: new Date().toISOString(),
        }));
        toast({
          title: "Welcome back!",
          description: `Logged in as ${data.user.username}`,
        });
        setLocation("/dashboard");
      } else {
        toast({
          title: "Verification Failed",
          description: data.error || "Invalid code",
          variant: "destructive",
        });
        setTwoFactorCode("");
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Unable to verify code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setRequires2FA(false);
    setUserId2FA(null);
    setTwoFactorCode("");
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
            {requires2FA ? (
              <>
                <div className="mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">Two-Factor Authentication</h1>
                  <p className="text-muted-foreground">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={setTwoFactorCode}
                      onComplete={handle2FAVerify}
                      data-testid="input-2fa-code"
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
                  </div>

                  <Button
                    type="button"
                    className="w-full gradient-btn"
                    onClick={handle2FAVerify}
                    disabled={isLoading || twoFactorCode.length !== 6}
                    data-testid="button-verify-2fa"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Shield size={18} className="mr-2" />
                        Verify Code
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleBack}
                    data-testid="button-back-login"
                  >
                    <ArrowLeft size={18} className="mr-2" />
                    Back to Login
                  </Button>
                </div>
              </>
            ) : (
              <>
            <div className="mb-8">
              <MnetiFiLogo size="lg" className="mx-auto mb-4" />
              <div className="flex items-center justify-center gap-2 mb-2">
                <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-0">
                  <Building2 size={12} className="mr-1" />
                  ISP Portal
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">ISP Admin Login</h1>
              <p className="text-muted-foreground">
                Sign in to manage your WiFi business
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <GlassInput
                label="Username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                icon={<User size={16} />}
                data-testid="input-username"
              />

              <GlassInput
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock size={16} />}
                data-testid="input-password"
              />

              <Button
                type="submit"
                className="w-full gradient-btn"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard
                    <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link 
                href="/forgot-password" 
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                data-testid="link-forgot-password"
              >
                Forgot your password?
              </Link>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
              <p className="text-sm text-muted-foreground">
                New ISP?{" "}
                <Link 
                  href="/register" 
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                  data-testid="link-register"
                >
                  Register your business
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                Need WiFi access?{" "}
                <Link href="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                  Go to the WiFi portal
                </Link>
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-muted-foreground">
                Platform Administrator?{" "}
                <Link 
                  href="/superadmin/login" 
                  className="text-pink-400 hover:text-pink-300 transition-colors font-medium"
                  data-testid="link-superadmin"
                >
                  Super Admin Login
                </Link>
              </p>
            </div>
            </>
            )}
          </GlassPanel>
        </motion.div>
      </div>
    </>
  );
}
