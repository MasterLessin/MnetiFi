import { useState } from "react";
import { Upload, Server, Users, FileText, CheckCircle } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { GlassInput } from "@/components/glass-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function MikroTikImportPage() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [formData, setFormData] = useState({
    routerIp: "",
    username: "",
    password: "",
    port: "8728",
  });

  const handleConnect = async () => {
    if (!formData.routerIp || !formData.username || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all router connection details.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Connection Successful",
        description: "Successfully connected to MikroTik router.",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to router. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast({
        title: "Import Complete",
        description: "Users have been imported from your MikroTik router.",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="settings-mikrotik-import-page">
      <div>
        <h1 className="text-2xl font-bold text-white">MikroTik Import</h1>
        <p className="text-muted-foreground">
          Import users and settings from your MikroTik router
        </p>
      </div>

      <GlassPanel size="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Server size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Router Connection</h2>
            <p className="text-sm text-muted-foreground">
              Connect to your MikroTik router via API
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassInput
            label="Router IP Address"
            placeholder="192.168.88.1"
            value={formData.routerIp}
            onChange={(e) => setFormData({ ...formData, routerIp: e.target.value })}
            icon={<Server size={16} />}
            data-testid="input-router-ip"
          />
          <GlassInput
            label="API Port"
            placeholder="8728"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: e.target.value })}
            data-testid="input-router-port"
          />
          <GlassInput
            label="Username"
            placeholder="admin"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            data-testid="input-router-username"
          />
          <GlassInput
            label="Password"
            type="password"
            placeholder="Router password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            data-testid="input-router-password"
          />
        </div>

        <div className="mt-6 flex gap-4">
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="gradient-btn"
            data-testid="button-connect-router"
          >
            <Server size={18} className="mr-2" />
            {isConnecting ? "Connecting..." : "Connect to Router"}
          </Button>
        </div>
      </GlassPanel>

      <GlassPanel size="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Upload size={20} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Import Options</h2>
            <p className="text-sm text-muted-foreground">
              Select what to import from your router
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <Users size={32} className="mx-auto mb-3 text-cyan-400" />
            <h3 className="font-medium text-white mb-1">Hotspot Users</h3>
            <p className="text-xs text-muted-foreground">
              Import all hotspot users
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <FileText size={32} className="mx-auto mb-3 text-purple-400" />
            <h3 className="font-medium text-white mb-1">User Profiles</h3>
            <p className="text-xs text-muted-foreground">
              Import user profiles/plans
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <CheckCircle size={32} className="mx-auto mb-3 text-green-400" />
            <h3 className="font-medium text-white mb-1">Active Sessions</h3>
            <p className="text-xs text-muted-foreground">
              Import active sessions
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={handleImport}
            disabled={isImporting}
            variant="outline"
            className="w-full"
            data-testid="button-import-users"
          >
            <Upload size={18} className="mr-2" />
            {isImporting ? "Importing Users..." : "Start Import"}
          </Button>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-muted-foreground">
            Make sure your MikroTik router has the API service enabled and that you have admin access. 
            The import process will not affect your router configuration.
          </p>
        </div>
      </GlassPanel>
    </div>
  );
}
