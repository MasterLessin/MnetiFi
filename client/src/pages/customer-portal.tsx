import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  User, 
  Wifi, 
  CreditCard, 
  Clock, 
  Calendar, 
  ArrowUpRight, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Phone,
  Mail,
  LogOut,
  Loader2,
  Shield,
  Zap
} from "lucide-react";
import type { WifiUser, Plan, Transaction } from "@shared/schema";

interface CustomerData {
  user: WifiUser;
  plan: Plan | null;
  transactions: Transaction[];
  hotspotName: string;
}

export default function CustomerPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"phone" | "verify" | "dashboard">("phone");
  const [verificationSent, setVerificationSent] = useState(false);
  const { toast } = useToast();

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
    enabled: isLoggedIn,
  });

  const requestOtpMutation = useMutation({
    mutationFn: async (phone: string) => {
      return apiRequest("POST", "/api/customer/request-otp", { phoneNumber: phone });
    },
    onSuccess: () => {
      setVerificationSent(true);
      setStep("verify");
      toast({
        title: "Verification code sent",
        description: "Check your phone for the verification code.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; code: string }) => {
      const response = await apiRequest("POST", "/api/customer/verify-otp", data);
      return response.json();
    },
    onSuccess: (data) => {
      setCustomerData(data);
      setIsLoggedIn(true);
      setStep("dashboard");
      toast({
        title: "Welcome back!",
        description: "You are now logged in to your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  const renewPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", "/api/customer/renew", { planId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "M-Pesa payment initiated",
        description: "Please check your phone and enter your M-Pesa PIN to complete payment.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    },
  });

  const handleRequestOtp = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    requestOtpMutation.mutate(phoneNumber);
  };

  const handleVerifyOtp = () => {
    if (!verificationCode || verificationCode.length < 4) {
      toast({
        title: "Invalid code",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }
    verifyOtpMutation.mutate({ phoneNumber, code: verificationCode });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCustomerData(null);
    setPhoneNumber("");
    setVerificationCode("");
    setStep("phone");
    setVerificationSent(false);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "expired":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "suspended":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getDaysRemaining = () => {
    if (!customerData?.user?.expiryTime) return 0;
    const now = new Date();
    const expiry = new Date(customerData.user.expiryTime);
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };
  
  const formatDuration = (durationSeconds: number) => {
    if (durationSeconds < 3600) {
      return `${Math.floor(durationSeconds / 60)} minutes`;
    } else if (durationSeconds < 86400) {
      return `${Math.floor(durationSeconds / 3600)} hours`;
    } else {
      return `${Math.floor(durationSeconds / 86400)} days`;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMGIyYWEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        
        <Card className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border-slate-700/50 relative z-10">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center mb-4">
              <Wifi size={32} className="text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Customer Portal
            </CardTitle>
            <CardDescription className="text-slate-400">
              Manage your WiFi subscription
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {step === "phone" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="07XX XXX XXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      data-testid="input-customer-phone"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Enter your registered phone number</p>
                </div>
                
                <Button
                  onClick={handleRequestOtp}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                  disabled={requestOtpMutation.isPending}
                  data-testid="button-request-otp"
                >
                  {requestOtpMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={18} />
                      Sending...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowUpRight className="ml-2" size={18} />
                    </>
                  )}
                </Button>
              </>
            )}

            {step === "verify" && (
              <>
                <div className="text-center mb-4">
                  <p className="text-slate-300">We sent a code to</p>
                  <p className="text-cyan-400 font-semibold">{phoneNumber}</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-slate-300">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter 4-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="text-center text-2xl tracking-widest bg-slate-700/50 border-slate-600 text-white"
                    maxLength={6}
                    data-testid="input-verification-code"
                  />
                </div>
                
                <Button
                  onClick={handleVerifyOtp}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                  disabled={verifyOtpMutation.isPending}
                  data-testid="button-verify-otp"
                >
                  {verifyOtpMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={18} />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify
                      <CheckCircle className="ml-2" size={18} />
                    </>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white"
                  onClick={() => {
                    setStep("phone");
                    setVerificationCode("");
                  }}
                  data-testid="button-back-to-phone"
                >
                  Change phone number
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMGIyYWEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
      
      <header className="relative z-10 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
              <Wifi size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">WiFi Portal</h1>
              <p className="text-xs text-slate-400">{customerData?.hotspotName || "Customer Portal"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-white font-medium">{customerData?.user?.username}</p>
              <p className="text-xs text-slate-400">{customerData?.user?.phoneNumber}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white"
              data-testid="button-logout"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-800/90 backdrop-blur-xl border-slate-700/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-white">Account Status</CardTitle>
                    <CardDescription className="text-slate-400">Your current subscription details</CardDescription>
                  </div>
                  <Badge className={getStatusColor(customerData?.user?.status || "pending")}>
                    {customerData?.user?.status?.toUpperCase() || "UNKNOWN"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Shield size={16} />
                      <span className="text-xs">Plan</span>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {customerData?.plan?.name || "No Plan"}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Clock size={16} />
                      <span className="text-xs">Days Left</span>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {getDaysRemaining()} days
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Calendar size={16} />
                      <span className="text-xs">Expires</span>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {formatDate(customerData?.user?.expiryTime || null)}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Zap size={16} />
                      <span className="text-xs">Speed</span>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {customerData?.plan?.downloadLimit || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 backdrop-blur-xl border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-xl text-white">Transaction History</CardTitle>
                <CardDescription className="text-slate-400">Your recent payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(!customerData?.transactions || customerData.transactions.length === 0) ? (
                    <div className="text-center py-8 text-slate-400">
                      <CreditCard size={48} className="mx-auto mb-3 opacity-50" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    customerData.transactions.slice(0, 10).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                        data-testid={`transaction-row-${tx.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            tx.status === "completed" 
                              ? "bg-green-500/20 text-green-400" 
                              : tx.status === "pending" 
                              ? "bg-yellow-500/20 text-yellow-400" 
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {tx.status === "completed" ? (
                              <CheckCircle size={20} />
                            ) : tx.status === "pending" ? (
                              <RefreshCw size={20} />
                            ) : (
                              <XCircle size={20} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">Plan Purchase</p>
                            <p className="text-xs text-slate-400">
                              {formatDate(tx.createdAt)} - {tx.mpesaReceiptNumber || "Processing"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">{formatCurrency(tx.amount)}</p>
                          <Badge variant="outline" className={`text-xs ${
                            tx.status === "completed" 
                              ? "border-green-500/30 text-green-400" 
                              : tx.status === "pending" 
                              ? "border-yellow-500/30 text-yellow-400" 
                              : "border-red-500/30 text-red-400"
                          }`}>
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-xl border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                  onClick={() => customerData?.plan && renewPlanMutation.mutate(customerData.plan.id)}
                  disabled={!customerData?.plan || renewPlanMutation.isPending}
                  data-testid="button-renew-plan"
                >
                  {renewPlanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={18} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2" size={18} />
                      Renew Current Plan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 backdrop-blur-xl border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Available Plans</CardTitle>
                <CardDescription className="text-slate-400">Upgrade or change your plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {plans?.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      customerData?.plan?.id === plan.id
                        ? "bg-cyan-500/10 border-cyan-500/50"
                        : "bg-slate-700/30 border-slate-600/50 hover:border-cyan-500/30"
                    }`}
                    data-testid={`plan-card-${plan.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white">{plan.name}</h4>
                      {customerData?.plan?.id === plan.id && (
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{formatDuration(plan.durationSeconds)} - {plan.downloadLimit}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-cyan-400">{formatCurrency(plan.price)}</span>
                      {customerData?.plan?.id !== plan.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => renewPlanMutation.mutate(plan.id)}
                          disabled={renewPlanMutation.isPending}
                          className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                          data-testid={`button-buy-plan-${plan.id}`}
                        >
                          Buy Now
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 backdrop-blur-xl border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href="tel:+254700000000"
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-slate-300"
                  data-testid="link-support-phone"
                >
                  <Phone size={18} className="text-cyan-400" />
                  <span>Call Support</span>
                </a>
                <a
                  href="mailto:support@example.com"
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-slate-300"
                  data-testid="link-support-email"
                >
                  <Mail size={18} className="text-cyan-400" />
                  <span>Email Support</span>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
