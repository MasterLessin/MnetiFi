import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  FileText,
  UserPlus,
  CreditCard,
  Clock,
  KeyRound
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmailTestResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const emailTemplates = [
  { 
    id: "verification", 
    name: "Email Verification", 
    description: "Sent during ISP registration to verify email address",
    icon: FileText 
  },
  { 
    id: "welcome", 
    name: "Welcome Email", 
    description: "Sent after successful ISP account creation",
    icon: UserPlus 
  },
  { 
    id: "payment", 
    name: "Payment Confirmation", 
    description: "Sent after successful subscription payment",
    icon: CreditCard 
  },
  { 
    id: "expiry", 
    name: "Expiry Notice", 
    description: "Sent when subscription is about to expire",
    icon: Clock 
  },
  { 
    id: "password_reset", 
    name: "Password Reset", 
    description: "Sent when ISP requests password recovery",
    icon: KeyRound 
  },
];

export default function SuperAdminEmailSettingsPage() {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("verification");
  const [lastTestResult, setLastTestResult] = useState<EmailTestResult | null>(null);

  const testEmailMutation = useMutation({
    mutationFn: async ({ email, templateType }: { email: string; templateType: string }) => {
      const response = await apiRequest("POST", "/api/superadmin/email/test", { email, templateType });
      return response.json() as Promise<EmailTestResult>;
    },
    onSuccess: (data) => {
      setLastTestResult(data);
      if (data.success) {
        toast({
          title: "Test Email Sent",
          description: `Email sent successfully! Message ID: ${data.messageId}`,
        });
      } else {
        toast({
          title: "Email Failed",
          description: data.error || "Failed to send test email",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      setLastTestResult({ success: false, error: error.message });
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  const handleTestEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    testEmailMutation.mutate({ email: testEmail, templateType: selectedTemplate });
  };

  const selectedTemplateInfo = emailTemplates.find(t => t.id === selectedTemplate);

  return (
    <div className="p-6 space-y-6" data-testid="superadmin-email-settings-page">
      <div>
        <h1 className="text-2xl font-bold text-white">Email Settings</h1>
        <p className="text-muted-foreground">
          Platform email configuration for ISP notifications and verification
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassPanel size="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Mail size={20} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Email Provider Status</h2>
              <p className="text-sm text-muted-foreground">
                Resend Email Integration
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Provider</span>
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-0">
                Resend
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">From Name</span>
              </div>
              <Badge className="bg-purple-500/20 text-purple-400 border-0">
                MnetiFi Platform
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Status</span>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-0">
                <CheckCircle2 size={12} className="mr-1" />
                Connected
              </Badge>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel size="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Send size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Send Test Email</h2>
              <p className="text-sm text-muted-foreground">
                Test email delivery with different templates
              </p>
            </div>
          </div>

          <form onSubmit={handleTestEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Template
              </label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-email-template">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplateInfo && (
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedTemplateInfo.description}
                </p>
              )}
            </div>

            <GlassInput
              type="email"
              placeholder="Enter recipient email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="bg-white/5"
              data-testid="input-test-email"
            />

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
              disabled={testEmailMutation.isPending || !testEmail}
              data-testid="button-send-test-email"
            >
              {testEmailMutation.isPending ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Send Test Email
                </>
              )}
            </Button>

            {lastTestResult && (
              <div className={`p-3 rounded-lg ${lastTestResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                <div className="flex items-center gap-2">
                  {lastTestResult.success ? (
                    <CheckCircle2 size={16} className="text-green-400" />
                  ) : (
                    <XCircle size={16} className="text-red-400" />
                  )}
                  <span className={lastTestResult.success ? 'text-green-400' : 'text-red-400'}>
                    {lastTestResult.success ? 'Email sent successfully' : 'Failed to send email'}
                  </span>
                </div>
                {lastTestResult.messageId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Message ID: {lastTestResult.messageId}
                  </p>
                )}
                {lastTestResult.error && (
                  <p className="text-xs text-red-400 mt-1">
                    {lastTestResult.error}
                  </p>
                )}
              </div>
            )}
          </form>
        </GlassPanel>
      </div>

      <GlassPanel size="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <FileText size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Email Templates</h2>
            <p className="text-sm text-muted-foreground">
              Automated emails sent to ISPs during account lifecycle
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emailTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <div 
                key={template.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover-elevate cursor-pointer"
                onClick={() => {
                  setSelectedTemplate(template.id);
                  toast({
                    title: "Template Selected",
                    description: `${template.name} template selected for testing`,
                  });
                }}
                data-testid={`card-template-${template.id}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                    <Icon size={18} className="text-cyan-400" />
                  </div>
                  <h3 className="font-medium text-white">{template.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                {selectedTemplate === template.id && (
                  <Badge className="mt-3 bg-cyan-500/20 text-cyan-400 border-0">
                    Selected
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel size="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Mail size={20} className="text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Email Usage</h2>
            <p className="text-sm text-muted-foreground">
              When emails are automatically sent
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-medium text-white mb-2">ISP Registration Flow</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-cyan-400" />
                Email verification code sent when ISP starts registration
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-cyan-400" />
                Welcome email sent after successful account creation
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-medium text-white mb-2">Subscription Management</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-400" />
                Payment confirmation sent after successful payment
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-400" />
                Expiry reminder sent 7, 3, and 1 day before subscription ends
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-medium text-white mb-2">Account Security</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-purple-400" />
                Password reset link sent when ISP requests recovery
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-red-400" />
                Account suspension notice sent when account is blocked
              </li>
            </ul>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
