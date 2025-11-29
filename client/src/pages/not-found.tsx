import { motion } from "framer-motion";
import { Link } from "wouter";
import { Home, ArrowLeft } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { GlassPanel } from "@/components/glass-panel";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <MeshBackground />

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GlassPanel size="lg" className="max-w-md mx-auto">
          <MnetiFiLogo size="lg" className="justify-center mb-8" />
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-8xl font-bold gradient-text">404</span>
          </motion.div>

          <h1 className="text-2xl font-semibold text-white mt-4 mb-2">
            Page Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button className="gradient-btn w-full sm:w-auto" data-testid="button-go-home">
                <Home size={18} className="mr-2" />
                Go to Portal
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full sm:w-auto" data-testid="button-go-dashboard">
                <ArrowLeft size={18} className="mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
