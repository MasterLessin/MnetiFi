import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Ticket, Search, CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft, Wifi } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Tenant } from "@shared/schema";

interface VoucherVerificationResult {
  valid: boolean;
  code: string;
  status: "available" | "used" | "expired" | "not_yet_valid" | "not_found";
  statusMessage: string;
  plan: {
    name: string;
    price: number;
    durationSeconds: number;
    speedLimit?: string;
  } | null;
  validFrom: string | null;
  validUntil: string | null;
  usedAt: string | null;
  usedBy: string | null;
  error?: string;
}

interface BrandingConfig {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  const days = Math.floor(seconds / 86400);
  return `${days} day${days > 1 ? "s" : ""}`;
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "available":
      return <CheckCircle className="w-16 h-16 text-green-400" />;
    case "used":
      return <XCircle className="w-16 h-16 text-red-400" />;
    case "expired":
      return <Clock className="w-16 h-16 text-amber-400" />;
    case "not_yet_valid":
      return <AlertCircle className="w-16 h-16 text-blue-400" />;
    case "not_found":
      return <AlertCircle className="w-16 h-16 text-gray-400" />;
    default:
      return <Ticket className="w-16 h-16 text-gray-400" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    available: "default",
    used: "destructive",
    expired: "secondary",
    not_yet_valid: "outline",
    not_found: "secondary",
  };
  
  const labels: Record<string, string> = {
    available: "Valid",
    used: "Used",
    expired: "Expired",
    not_yet_valid: "Not Yet Valid",
    not_found: "Not Found",
  };

  return (
    <Badge variant={variants[status] || "outline"} className="text-sm px-3 py-1">
      {labels[status] || status}
    </Badge>
  );
}

export default function VoucherVerifyPage() {
  const { toast } = useToast();
  const [voucherCode, setVoucherCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VoucherVerificationResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/portal/tenant"],
  });

  const branding: BrandingConfig = useMemo(() => {
    const config = tenant?.brandingConfig || {};
    return {
      logo: config.logo || "",
      primaryColor: config.primaryColor || "#22d3ee",
      secondaryColor: config.secondaryColor || "#a855f7",
    };
  }, [tenant]);

  const gradientStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
  }), [branding]);

  const handleVerify = async () => {
    if (!voucherCode.trim()) {
      toast({
        title: "Enter Voucher Code",
        description: "Please enter a voucher code to verify",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setHasSearched(true);
    
    try {
      const response = await fetch(`/api/portal/verify-voucher/${encodeURIComponent(voucherCode.trim())}`);
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else if (response.status === 404) {
        setResult({
          valid: false,
          code: voucherCode.toUpperCase(),
          status: "not_found",
          statusMessage: "Voucher not found. Please check the code and try again.",
          plan: null,
          validFrom: null,
          validUntil: null,
          usedAt: null,
          usedBy: null,
          error: "not_found",
        });
      } else {
        try {
          const errorData = await response.json();
          if (errorData.status) {
            setResult({
              valid: false,
              code: voucherCode.toUpperCase(),
              status: errorData.status,
              statusMessage: errorData.statusMessage || errorData.error || "Voucher is not available.",
              plan: errorData.plan || null,
              validFrom: errorData.validFrom || null,
              validUntil: errorData.validUntil || null,
              usedAt: errorData.usedAt || null,
              usedBy: errorData.usedBy || null,
              error: errorData.error,
            });
          } else {
            throw new Error(errorData.error || "Verification failed");
          }
        } catch {
          toast({
            title: "Verification Failed",
            description: "Unable to verify voucher. Please try again.",
            variant: "destructive",
          });
          setResult(null);
        }
      }
    } catch {
      toast({
        title: "Verification Failed",
        description: "Unable to verify voucher. Please try again.",
        variant: "destructive",
      });
      setResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setVoucherCode("");
    setResult(null);
    setHasSearched(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <MeshBackground />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <div className="flex flex-col items-center mb-8">
            {branding.logo ? (
              <img 
                src={branding.logo} 
                alt="Logo" 
                className="h-12 mb-4 object-contain"
              />
            ) : (
              <MnetiFiLogo size="lg" className="mb-4" />
            )}
            <h1 className="text-2xl font-bold text-foreground text-center">
              Voucher Verification
            </h1>
            <p className="text-muted-foreground text-center mt-2">
              Check if your voucher code is valid before use
            </p>
          </div>

          <GlassPanel className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <GlassInput
                  placeholder="Enter voucher code (e.g., ABC123)"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono tracking-wider"
                  disabled={isVerifying}
                  data-testid="input-voucher-code"
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={isVerifying || !voucherCode.trim()}
                className="w-full"
                style={gradientStyle}
                data-testid="button-verify-voucher"
              >
                {isVerifying ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Verify Voucher
                  </>
                )}
              </Button>
            </div>

            <AnimatePresence mode="wait">
              {hasSearched && result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="flex flex-col items-center text-center py-4">
                    <StatusIcon status={result.status} />
                    <h3 className="text-xl font-bold mt-4 text-foreground" data-testid="text-voucher-code">
                      {result.code}
                    </h3>
                    <StatusBadge status={result.status} />
                    <p className="text-muted-foreground mt-2" data-testid="text-status-message">
                      {result.statusMessage}
                    </p>
                  </div>

                  {result.valid && result.plan && (
                    <Card className="bg-background/50 border-border/50">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-foreground">
                          <Wifi className="w-5 h-5 text-primary" />
                          <span className="font-semibold">Plan Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">Plan Name:</span>
                          <span className="font-medium text-foreground" data-testid="text-plan-name">{result.plan.name}</span>
                          
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium text-foreground" data-testid="text-plan-duration">
                            {formatDuration(result.plan.durationSeconds)}
                          </span>
                          
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-medium text-foreground" data-testid="text-plan-price">
                            KES {result.plan.price}
                          </span>
                          
                          {result.plan.speedLimit && (
                            <>
                              <span className="text-muted-foreground">Speed:</span>
                              <span className="font-medium text-foreground">{result.plan.speedLimit}</span>
                            </>
                          )}
                        </div>
                        
                        {(result.validFrom || result.validUntil) && (
                          <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-sm">
                            {result.validFrom && (
                              <>
                                <span className="text-muted-foreground">Valid From:</span>
                                <span className="text-foreground">{formatDate(result.validFrom)}</span>
                              </>
                            )}
                            {result.validUntil && (
                              <>
                                <span className="text-muted-foreground">Valid Until:</span>
                                <span className="text-foreground">{formatDate(result.validUntil)}</span>
                              </>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {result.status === "used" && result.usedAt && (
                    <Card className="bg-destructive/10 border-destructive/20">
                      <CardContent className="p-4 text-sm space-y-1">
                        <p className="text-muted-foreground">
                          Used on: <span className="text-foreground">{formatDate(result.usedAt)}</span>
                        </p>
                        {result.usedBy && (
                          <p className="text-muted-foreground">
                            Used by: <span className="text-foreground">{result.usedBy}</span>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="flex-1"
                      data-testid="button-check-another"
                    >
                      Check Another
                    </Button>
                    {result.valid && (
                      <Link href="/captive-portal" className="flex-1">
                        <Button 
                          className="w-full" 
                          style={gradientStyle}
                          data-testid="button-use-voucher"
                        >
                          Use Voucher
                        </Button>
                      </Link>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassPanel>

          <div className="mt-6 text-center">
            <Link href="/captive-portal">
              <Button variant="ghost" className="text-muted-foreground" data-testid="link-back-to-portal">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
