import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, ShieldOff, Loader2, QrCode, Key, Copy, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function SecuritySettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (!session) {
      setLocation("/login");
      return;
    }
    fetch2FAStatus();
  }, [setLocation]);

  const fetch2FAStatus = async () => {
    try {
      const response = await fetch("/api/auth/2fa/status");
      if (response.ok) {
        const data = await response.json();
        setIs2FAEnabled(data.enabled);
      }
    } catch (error) {
      console.error("Failed to fetch 2FA status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setSetupDialogOpen(true);
      } else {
        const data = await response.json();
        toast({
          title: "Setup Failed",
          description: data.error || "Failed to set up 2FA",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (response.ok) {
        toast({
          title: "2FA Enabled",
          description: "Two-factor authentication is now active on your account",
        });
        setIs2FAEnabled(true);
        setSetupDialogOpen(false);
        setQrCode(null);
        setSecret(null);
        setVerificationCode("");
      } else {
        const data = await response.json();
        toast({
          title: "Verification Failed",
          description: data.error || "Invalid code",
          variant: "destructive",
        });
        setVerificationCode("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify code",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword || disableCode.length !== 6) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
      });

      if (response.ok) {
        toast({
          title: "2FA Disabled",
          description: "Two-factor authentication has been removed from your account",
        });
        setIs2FAEnabled(false);
        setDisableDialogOpen(false);
        setDisablePassword("");
        setDisableCode("");
      } else {
        const data = await response.json();
        toast({
          title: "Failed to Disable",
          description: data.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable 2FA",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast({
        title: "Copied",
        description: "Secret key copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-security-title">Security Settings</h1>
        <p className="text-muted-foreground">Manage your account security preferences</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${is2FAEnabled ? 'bg-green-500/10' : 'bg-muted'}`}>
                {is2FAEnabled ? (
                  <ShieldCheck className="w-6 h-6 text-green-500" />
                ) : (
                  <Shield className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
            </div>
            <Badge variant={is2FAEnabled ? "default" : "secondary"} data-testid="badge-2fa-status">
              {is2FAEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication adds an additional layer of security to your account by requiring 
              a verification code from your authenticator app whenever you sign in.
            </p>
            
            {is2FAEnabled ? (
              <Button
                variant="destructive"
                onClick={() => setDisableDialogOpen(true)}
                disabled={isSubmitting}
                data-testid="button-disable-2fa"
              >
                <ShieldOff className="w-4 h-4 mr-2" />
                Disable 2FA
              </Button>
            ) : (
              <Button
                onClick={handleSetup2FA}
                disabled={isSubmitting}
                data-testid="button-enable-2fa"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                Enable 2FA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Set Up Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {qrCode && (
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" data-testid="img-2fa-qr" />
                </div>
              </div>
            )}
            
            {secret && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Or enter this secret key manually:
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={showSecret ? secret : "••••••••••••••••"}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-2fa-secret"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowSecret(!showSecret)}
                    data-testid="button-toggle-secret"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={copySecret}
                    data-testid="button-copy-secret"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Enter the 6-digit verification code from your app:</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  data-testid="input-2fa-verify-code"
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
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSetupDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify2FA}
              disabled={isSubmitting || verificationCode.length !== 6}
              data-testid="button-confirm-2fa"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Key className="w-4 h-4 mr-2" />
              )}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldOff className="w-5 h-5" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              To disable 2FA, please confirm your password and enter a verification code.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
                data-testid="input-disable-password"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={disableCode}
                  onChange={setDisableCode}
                  data-testid="input-disable-code"
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
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDisableDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={isSubmitting || !disablePassword || disableCode.length !== 6}
              data-testid="button-confirm-disable-2fa"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldOff className="w-4 h-4 mr-2" />
              )}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
