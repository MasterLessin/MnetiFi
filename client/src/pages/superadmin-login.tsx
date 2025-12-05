import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { User, Lock, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function SuperAdminLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("superadmin_session");
    if (session) {
      try {
        const sessionData = JSON.parse(session);
        const lastActivity = new Date(sessionData.lastActivity).getTime();
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        
        if (now - lastActivity < tenMinutes && sessionData.user?.role === "superadmin") {
          setLocation("/superadmin");
        } else {
          localStorage.removeItem("superadmin_session");
        }
      } catch {
        localStorage.removeItem("superadmin_session");
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
        if (data.user.role !== "superadmin") {
          toast({
            title: "Access Denied",
            description: "This login is for Super Admins only. Please use the ISP login.",
            variant: "destructive",
          });
          return;
        }

        localStorage.setItem("superadmin_session", JSON.stringify({
          user: data.user,
          lastActivity: new Date().toISOString(),
        }));
        toast({
          title: "Welcome, Super Admin!",
          description: `Logged in as ${data.user.username}`,
        });
        setLocation("/superadmin");
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
              <h1 className="text-2xl font-bold text-white mb-2">Super Admin Login</h1>
              <p className="text-muted-foreground">
                Sign in to manage the MnetiFi platform
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <GlassInput
                label="Username"
                placeholder="Enter your admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                icon={<User size={16} />}
                data-testid="input-superadmin-username"
              />

              <GlassInput
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock size={16} />}
                data-testid="input-superadmin-password"
              />

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                disabled={isLoading}
                data-testid="button-superadmin-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Access Platform Console
                    <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link 
                href="/superadmin/forgot-password" 
                className="text-sm text-pink-400 hover:text-pink-300 transition-colors"
                data-testid="link-superadmin-forgot-password"
              >
                Forgot your password?
              </Link>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-muted-foreground">
                ISP Administrator?{" "}
                <Link 
                  href="/login" 
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                  data-testid="link-isp-login"
                >
                  Go to ISP Login
                </Link>
              </p>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 text-left">
              <p className="text-xs text-pink-200/80">
                <ShieldCheck size={14} className="inline mr-1" />
                This portal is for MnetiFi platform administrators only. Unauthorized access attempts are logged.
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </>
  );
}
