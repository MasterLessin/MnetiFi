import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { User, Lock, Loader2, ArrowRight } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
              <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
              <p className="text-muted-foreground">
                Sign in to access the dashboard
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
                    Sign In
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
                  Create an account
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                Need WiFi access?{" "}
                <Link href="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                  Go to the WiFi portal
                </Link>
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </>
  );
}
