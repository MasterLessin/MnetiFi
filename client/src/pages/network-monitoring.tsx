import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Network, 
  RefreshCw, 
  Power, 
  Wifi,
  ArrowUp,
  ArrowDown,
  Router,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Users,
  Shield,
  Globe,
  Download,
  Upload,
  Trash2,
  Plus,
  Settings,
  Eye,
  EyeOff,
  Save,
  FileText,
  Palette,
  Zap,
  ExternalLink,
  RotateCcw,
  Database,
  Server,
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import type { Hotspot } from "@shared/schema";

interface RouterStats {
  uptime: string;
  cpuLoad: number;
  freeMemory: number;
  totalMemory: number;
  freeDisk: number;
  totalDisk: number;
  boardName: string;
  version: string;
  architecture: string;
}

interface BandwidthData {
  time: string;
  upload: number;
  download: number;
}

interface InterfaceStats {
  name: string;
  type: string;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  running: boolean;
  disabled: boolean;
}

interface ActiveSession {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
}

interface FirewallRule {
  ".id": string;
  chain: string;
  action: string;
  "src-address"?: string;
  "dst-address"?: string;
  protocol?: string;
  "dst-port"?: string;
  comment?: string;
  disabled: string;
}

interface IpPool {
  ".id": string;
  name: string;
  ranges: string;
}

interface WalledGardenEntry {
  ".id": string;
  "dst-host": string;
  action: string;
  comment?: string;
}

interface RouterBackup {
  id: string;
  name: string;
  type: string;
  routerVersion?: string;
  routerIdentity?: string;
  createdAt: string;
}

interface LoginTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  config: Record<string, any>;
  createdAt: string;
}

interface ConnectionTestResult {
  success: boolean;
  data?: {
    identity: any;
    resources: any;
    health?: any;
    connectionTime: string;
  };
  error?: string;
}

export default function NetworkMonitoringPage() {
  const { toast } = useToast();
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [bandwidthHistory, setBandwidthHistory] = useState<BandwidthData[]>([]);
  const [isRebooting, setIsRebooting] = useState(false);
  const [firewallType, setFirewallType] = useState<"filter" | "nat" | "mangle">("filter");
  const [showNewPoolDialog, setShowNewPoolDialog] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolRanges, setNewPoolRanges] = useState("");
  const [backupName, setBackupName] = useState("");
  const [backupNotes, setBackupNotes] = useState("");
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);

  const { data: hotspots = [], isLoading: hotspotsLoading } = useQuery<Hotspot[]>({
    queryKey: ["/api/hotspots"],
  });

  const { data: routerStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<RouterStats>({
    queryKey: ["/api/hotspots", selectedHotspot, "stats"],
    enabled: !!selectedHotspot,
    refetchInterval: 10000,
  });

  const { data: interfaces = [], isLoading: interfacesLoading } = useQuery<InterfaceStats[]>({
    queryKey: ["/api/hotspots", selectedHotspot, "interfaces"],
    enabled: !!selectedHotspot,
    refetchInterval: 5000,
  });

  const { data: activeSessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery<ActiveSession[]>({
    queryKey: ["/api/hotspots", selectedHotspot, "sessions"],
    enabled: !!selectedHotspot,
    refetchInterval: 10000,
  });

  const { data: firewallRules, isLoading: firewallLoading, refetch: refetchFirewall } = useQuery<{ data: FirewallRule[] }>({
    queryKey: ["/api/hotspots", selectedHotspot, "firewall", firewallType],
    enabled: !!selectedHotspot,
  });

  const { data: ipPools, isLoading: poolsLoading, refetch: refetchPools } = useQuery<{ data: IpPool[] }>({
    queryKey: ["/api/hotspots", selectedHotspot, "ip-pools"],
    enabled: !!selectedHotspot,
  });

  const { data: walledGardenRouter, isLoading: walledGardenLoading, refetch: refetchWalledGarden } = useQuery<{ data: WalledGardenEntry[] }>({
    queryKey: ["/api/hotspots", selectedHotspot, "walled-garden-router"],
    enabled: !!selectedHotspot,
  });

  const { data: backups = [], isLoading: backupsLoading, refetch: refetchBackups } = useQuery<RouterBackup[]>({
    queryKey: ["/api/hotspots", selectedHotspot, "backups"],
    enabled: !!selectedHotspot,
  });

  const { data: dhcpLeases, isLoading: leasesLoading } = useQuery<{ data: any[] }>({
    queryKey: ["/api/hotspots", selectedHotspot, "dhcp-leases"],
    enabled: !!selectedHotspot,
    refetchInterval: 15000,
  });

  const { data: arpTable, isLoading: arpLoading } = useQuery<{ data: any[] }>({
    queryKey: ["/api/hotspots", selectedHotspot, "arp"],
    enabled: !!selectedHotspot,
    refetchInterval: 15000,
  });

  const { data: queues, isLoading: queuesLoading } = useQuery<{ data: any[] }>({
    queryKey: ["/api/hotspots", selectedHotspot, "queues"],
    enabled: !!selectedHotspot,
    refetchInterval: 10000,
  });

  const { data: loginTemplates = [], refetch: refetchTemplates } = useQuery<LoginTemplate[]>({
    queryKey: ["/api/login-templates"],
  });

  useEffect(() => {
    if (hotspots.length > 0 && !selectedHotspot) {
      setSelectedHotspot(hotspots[0].id);
    }
  }, [hotspots, selectedHotspot]);

  useEffect(() => {
    if (interfaces.length > 0) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const totalUpload = interfaces.reduce((sum, iface) => sum + iface.txBytes, 0);
      const totalDownload = interfaces.reduce((sum, iface) => sum + iface.rxBytes, 0);
      
      setBandwidthHistory(prev => {
        const newData = [...prev, { time: timeStr, upload: totalUpload, download: totalDownload }];
        return newData.slice(-20);
      });
    }
  }, [interfaces]);

  const testConnection = async () => {
    if (!selectedHotspot) return;
    setIsTesting(true);
    setConnectionResult(null);
    try {
      const result = await apiRequest("POST", `/api/hotspots/${selectedHotspot}/test-connection`);
      const data = await result.json();
      setConnectionResult(data);
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: `Connected to ${data.data?.identity?.name || "router"} (RouterOS ${data.data?.resources?.version || "unknown"})`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Could not connect to router",
          variant: "destructive",
        });
      }
    } catch (error) {
      setConnectionResult({ success: false, error: "Connection test failed" });
      toast({
        title: "Connection Failed",
        description: "Could not connect to router",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReboot = async () => {
    if (!selectedHotspot) return;
    setIsRebooting(true);
    try {
      await apiRequest("POST", `/api/hotspots/${selectedHotspot}/reboot`);
      toast({
        title: "Reboot Initiated",
        description: "Router is rebooting. Please wait a few moments.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reboot router",
        variant: "destructive",
      });
    } finally {
      setIsRebooting(false);
    }
  };

  const disconnectSession = async (sessionId: string) => {
    if (!selectedHotspot) return;
    try {
      await apiRequest("DELETE", `/api/hotspots/${selectedHotspot}/sessions/${sessionId}`);
      toast({
        title: "Session Disconnected",
        description: "User has been disconnected",
      });
      refetchSessions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect session",
        variant: "destructive",
      });
    }
  };

  const toggleFirewallRule = async (ruleId: string, disabled: boolean) => {
    if (!selectedHotspot) return;
    try {
      await apiRequest("PATCH", `/api/hotspots/${selectedHotspot}/firewall/${firewallType}/${ruleId}`, {
        action: disabled ? "enable" : "disable",
      });
      toast({
        title: disabled ? "Rule Enabled" : "Rule Disabled",
        description: "Firewall rule updated successfully",
      });
      refetchFirewall();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update firewall rule",
        variant: "destructive",
      });
    }
  };

  const addIpPool = async () => {
    if (!selectedHotspot || !newPoolName || !newPoolRanges) return;
    try {
      await apiRequest("POST", `/api/hotspots/${selectedHotspot}/ip-pools`, {
        name: newPoolName,
        ranges: newPoolRanges,
      });
      toast({
        title: "IP Pool Created",
        description: `Pool "${newPoolName}" has been created`,
      });
      setNewPoolName("");
      setNewPoolRanges("");
      setShowNewPoolDialog(false);
      refetchPools();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create IP pool",
        variant: "destructive",
      });
    }
  };

  const deleteIpPool = async (poolId: string) => {
    if (!selectedHotspot) return;
    try {
      await apiRequest("DELETE", `/api/hotspots/${selectedHotspot}/ip-pools/${poolId}`);
      toast({
        title: "IP Pool Deleted",
        description: "Pool has been removed",
      });
      refetchPools();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete IP pool",
        variant: "destructive",
      });
    }
  };

  const syncWalledGarden = async () => {
    if (!selectedHotspot) return;
    try {
      const result = await apiRequest("POST", `/api/hotspots/${selectedHotspot}/sync-walled-garden`);
      const data = await result.json();
      if (data.success) {
        toast({
          title: "Walled Garden Synced",
          description: `Added ${data.data?.added || 0} entries to router`,
        });
      } else {
        toast({
          title: "Sync Completed with Errors",
          description: `Added: ${data.data?.added || 0}, Failed: ${data.data?.failed || 0}`,
          variant: "destructive",
        });
      }
      refetchWalledGarden();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync walled garden",
        variant: "destructive",
      });
    }
  };

  const createBackup = async () => {
    if (!selectedHotspot) return;
    try {
      await apiRequest("POST", `/api/hotspots/${selectedHotspot}/backup`, {
        name: backupName || `Backup ${new Date().toLocaleString()}`,
        notes: backupNotes,
      });
      toast({
        title: "Backup Created",
        description: "Router configuration has been backed up",
      });
      setBackupName("");
      setBackupNotes("");
      setShowBackupDialog(false);
      refetchBackups();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create backup",
        variant: "destructive",
      });
    }
  };

  const downloadBackup = async (backupId: string, name: string) => {
    try {
      const response = await fetch(`/api/router-backups/${backupId}/download`, {
        credentials: "include",
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.rsc`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download backup",
        variant: "destructive",
      });
    }
  };

  const deleteBackup = async (backupId: string) => {
    try {
      await apiRequest("DELETE", `/api/router-backups/${backupId}`);
      toast({
        title: "Backup Deleted",
        description: "Backup has been removed",
      });
      refetchBackups();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete backup",
        variant: "destructive",
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const selectedHotspotData = hotspots.find(h => h.id === selectedHotspot);

  if (hotspotsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (hotspots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Router className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No Hotspots Configured</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Add a hotspot with MikroTik router credentials to start monitoring your network.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="network-monitoring-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Network Management</h1>
          <p className="text-muted-foreground">Monitor and configure your MikroTik routers</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedHotspot || ""} onValueChange={setSelectedHotspot}>
            <SelectTrigger className="w-[220px]" data-testid="select-hotspot">
              <SelectValue placeholder="Select hotspot" />
            </SelectTrigger>
            <SelectContent>
              {hotspots.map((hotspot) => (
                <SelectItem key={hotspot.id} value={hotspot.id}>
                  <div className="flex items-center gap-2">
                    <Router className="w-4 h-4" />
                    {hotspot.locationName}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={testConnection}
            disabled={!selectedHotspot || isTesting}
            data-testid="button-test-connection"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetchStats();
              refetchSessions();
            }}
            disabled={!selectedHotspot}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                disabled={!selectedHotspot || isRebooting}
                data-testid="button-reboot"
              >
                {isRebooting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reboot Router?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will restart the router and disconnect all active sessions.
                  The router will be unavailable for a few minutes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReboot}>Reboot</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {connectionResult && (
        <Card className={connectionResult.success ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {connectionResult.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-500" />
              )}
              <div>
                <p className="font-medium">
                  {connectionResult.success ? "Connection Successful" : "Connection Failed"}
                </p>
                {connectionResult.success && connectionResult.data && (
                  <p className="text-sm text-muted-foreground">
                    {connectionResult.data.identity?.name || "Unknown"} | 
                    RouterOS {connectionResult.data.resources?.version || "unknown"} |
                    {connectionResult.data.resources?.["board-name"] || ""}
                  </p>
                )}
                {!connectionResult.success && (
                  <p className="text-sm text-muted-foreground">{connectionResult.error}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedHotspot && (
        <div className="space-y-6">
          {routerStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card className="bg-card/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Uptime</span>
                  </div>
                  <p className="font-semibold text-sm truncate" data-testid="text-uptime">{routerStats.uptime}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Cpu className="w-4 h-4" />
                    <span className="text-xs">CPU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={routerStats.cpuLoad} className="flex-1 h-2" />
                    <span className="text-sm font-semibold" data-testid="text-cpu">{routerStats.cpuLoad}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MemoryStick className="w-4 h-4" />
                    <span className="text-xs">Memory</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={((routerStats.totalMemory - routerStats.freeMemory) / routerStats.totalMemory) * 100} 
                      className="flex-1 h-2" 
                    />
                    <span className="text-sm font-semibold" data-testid="text-memory">
                      {formatBytes(routerStats.totalMemory - routerStats.freeMemory)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-xs">Storage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={((routerStats.totalDisk - routerStats.freeDisk) / routerStats.totalDisk) * 100} 
                      className="flex-1 h-2" 
                    />
                    <span className="text-sm font-semibold" data-testid="text-storage">
                      {formatBytes(routerStats.totalDisk - routerStats.freeDisk)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Server className="w-4 h-4" />
                    <span className="text-xs">Board</span>
                  </div>
                  <p className="font-semibold text-sm truncate" data-testid="text-board">{routerStats.boardName}</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs">RouterOS</span>
                  </div>
                  <p className="font-semibold text-sm truncate" data-testid="text-version">{routerStats.version}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="sessions" data-testid="tab-sessions">Sessions</TabsTrigger>
              <TabsTrigger value="firewall" data-testid="tab-firewall">Firewall</TabsTrigger>
              <TabsTrigger value="ip-pools" data-testid="tab-ip-pools">IP Pools</TabsTrigger>
              <TabsTrigger value="walled-garden" data-testid="tab-walled-garden">Walled Garden</TabsTrigger>
              <TabsTrigger value="backups" data-testid="tab-backups">Backups</TabsTrigger>
              <TabsTrigger value="network" data-testid="tab-network">Network</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Bandwidth History
                    </CardTitle>
                    <CardDescription>Network traffic over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={bandwidthHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="time" stroke="#888" tick={{ fill: "#888" }} />
                          <YAxis stroke="#888" tick={{ fill: "#888" }} tickFormatter={(value) => formatBytes(value)} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333" }}
                            formatter={(value: number) => formatBytes(value)}
                          />
                          <Area type="monotone" dataKey="download" name="Download" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                          <Area type="monotone" dataKey="upload" name="Upload" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="w-5 h-5" />
                      Interfaces
                    </CardTitle>
                    <CardDescription>Network interface statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      {interfacesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {interfaces.map((iface, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                              data-testid={`interface-${index}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${iface.running ? "bg-green-500/20" : "bg-gray-500/20"}`}>
                                  <Network className={`w-4 h-4 ${iface.running ? "text-green-400" : "text-gray-400"}`} />
                                </div>
                                <div>
                                  <p className="font-medium">{iface.name}</p>
                                  <p className="text-xs text-muted-foreground">{iface.type}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-green-400">
                                  <ArrowDown className="w-3 h-3" />
                                  {formatBytes(iface.rxBytes)}
                                </div>
                                <div className="flex items-center gap-1 text-cyan-400">
                                  <ArrowUp className="w-3 h-3" />
                                  {formatBytes(iface.txBytes)}
                                </div>
                                <Badge variant={iface.running ? "default" : "secondary"}>
                                  {iface.running ? "Up" : "Down"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sessions">
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Active Hotspot Sessions ({activeSessions.length})
                  </CardTitle>
                  <CardDescription>Currently connected users</CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    </div>
                  ) : activeSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mb-2" />
                      <p>No active sessions</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {activeSessions.map((session, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            data-testid={`session-${index}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-green-500/20">
                                <Wifi className="w-4 h-4 text-green-400" />
                              </div>
                              <div>
                                <p className="font-medium">{session.user}</p>
                                <p className="text-xs text-muted-foreground">
                                  {session.address} | {session.macAddress}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Uptime</p>
                                <p>{session.uptime}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Usage</p>
                                <p className="flex items-center gap-1">
                                  <ArrowDown className="w-3 h-3 text-green-400" />
                                  {formatBytes(session.bytesIn)}
                                  <ArrowUp className="w-3 h-3 text-cyan-400 ml-2" />
                                  {formatBytes(session.bytesOut)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => disconnectSession(session.id)}
                                data-testid={`button-disconnect-${index}`}
                              >
                                <Power className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="firewall">
              <Card className="bg-card/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Firewall Rules
                      </CardTitle>
                      <CardDescription>Manage router firewall configuration</CardDescription>
                    </div>
                    <Select value={firewallType} onValueChange={(v) => setFirewallType(v as any)}>
                      <SelectTrigger className="w-[150px]" data-testid="select-firewall-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filter">Filter Rules</SelectItem>
                        <SelectItem value="nat">NAT Rules</SelectItem>
                        <SelectItem value="mangle">Mangle Rules</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {firewallLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {(firewallRules?.data || []).map((rule: FirewallRule, index: number) => (
                          <div
                            key={rule[".id"]}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              rule.disabled === "true" ? "bg-muted/30 opacity-60" : "bg-muted/50"
                            }`}
                            data-testid={`firewall-rule-${index}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Badge variant={rule.action === "accept" || rule.action === "masquerade" ? "default" : "destructive"}>
                                {rule.action}
                              </Badge>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-medium">Chain: {rule.chain}</span>
                                  {rule.protocol && <Badge variant="outline">{rule.protocol}</Badge>}
                                  {rule["dst-port"] && <span className="text-muted-foreground">Port: {rule["dst-port"]}</span>}
                                </div>
                                {rule.comment && (
                                  <p className="text-xs text-muted-foreground mt-1">{rule.comment}</p>
                                )}
                                {(rule["src-address"] || rule["dst-address"]) && (
                                  <p className="text-xs text-muted-foreground">
                                    {rule["src-address"] && `Src: ${rule["src-address"]}`}
                                    {rule["src-address"] && rule["dst-address"] && " | "}
                                    {rule["dst-address"] && `Dst: ${rule["dst-address"]}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFirewallRule(rule[".id"], rule.disabled === "true")}
                              data-testid={`button-toggle-rule-${index}`}
                            >
                              {rule.disabled === "true" ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ip-pools">
              <Card className="bg-card/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        IP Address Pools
                      </CardTitle>
                      <CardDescription>Manage IP address pools for DHCP and hotspot</CardDescription>
                    </div>
                    <Dialog open={showNewPoolDialog} onOpenChange={setShowNewPoolDialog}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-pool">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Pool
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create IP Pool</DialogTitle>
                          <DialogDescription>
                            Add a new IP address pool to the router
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="pool-name">Pool Name</Label>
                            <Input
                              id="pool-name"
                              value={newPoolName}
                              onChange={(e) => setNewPoolName(e.target.value)}
                              placeholder="hotspot-pool"
                              data-testid="input-pool-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="pool-ranges">IP Ranges</Label>
                            <Input
                              id="pool-ranges"
                              value={newPoolRanges}
                              onChange={(e) => setNewPoolRanges(e.target.value)}
                              placeholder="10.0.0.2-10.0.0.254"
                              data-testid="input-pool-ranges"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowNewPoolDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={addIpPool} data-testid="button-create-pool">
                            Create Pool
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {poolsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(ipPools?.data || []).map((pool: IpPool, index: number) => (
                        <div
                          key={pool[".id"]}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                          data-testid={`ip-pool-${index}`}
                        >
                          <div>
                            <p className="font-medium">{pool.name}</p>
                            <p className="text-sm text-muted-foreground">{pool.ranges}</p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`button-delete-pool-${index}`}>
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete IP Pool?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the IP pool "{pool.name}" from the router.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteIpPool(pool[".id"])}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="walled-garden">
              <Card className="bg-card/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Walled Garden
                      </CardTitle>
                      <CardDescription>Sites accessible before login (sync from dashboard settings)</CardDescription>
                    </div>
                    <Button onClick={syncWalledGarden} data-testid="button-sync-walled-garden">
                      <Upload className="w-4 h-4 mr-2" />
                      Sync to Router
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {walledGardenLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {(walledGardenRouter?.data || []).map((entry: WalledGardenEntry, index: number) => (
                          <div
                            key={entry[".id"]}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            data-testid={`walled-garden-${index}`}
                          >
                            <div className="flex items-center gap-3">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{entry["dst-host"]}</p>
                                {entry.comment && (
                                  <p className="text-xs text-muted-foreground">{entry.comment}</p>
                                )}
                              </div>
                            </div>
                            <Badge variant={entry.action === "allow" ? "default" : "destructive"}>
                              {entry.action}
                            </Badge>
                          </div>
                        ))}
                        {(!walledGardenRouter?.data || walledGardenRouter.data.length === 0) && (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Globe className="w-8 h-8 mb-2" />
                            <p>No walled garden entries on router</p>
                            <p className="text-sm">Click "Sync to Router" to push entries from dashboard</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="backups">
              <Card className="bg-card/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        Router Backups
                      </CardTitle>
                      <CardDescription>Configuration backup history</CardDescription>
                    </div>
                    <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-backup">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Backup
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Router Backup</DialogTitle>
                          <DialogDescription>
                            Export the current router configuration
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="backup-name">Backup Name (optional)</Label>
                            <Input
                              id="backup-name"
                              value={backupName}
                              onChange={(e) => setBackupName(e.target.value)}
                              placeholder="Pre-update backup"
                              data-testid="input-backup-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="backup-notes">Notes (optional)</Label>
                            <Textarea
                              id="backup-notes"
                              value={backupNotes}
                              onChange={(e) => setBackupNotes(e.target.value)}
                              placeholder="Notes about this backup..."
                              data-testid="input-backup-notes"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={createBackup} data-testid="button-save-backup">
                            Create Backup
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {backupsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : backups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Save className="w-8 h-8 mb-2" />
                      <p>No backups yet</p>
                      <p className="text-sm">Create your first backup to protect your configuration</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {backups.map((backup, index) => (
                        <div
                          key={backup.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                          data-testid={`backup-${index}`}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{backup.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {backup.routerIdentity} | RouterOS {backup.routerVersion} | {new Date(backup.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadBackup(backup.id, backup.name)}
                              data-testid={`button-download-backup-${index}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`button-delete-backup-${index}`}>
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This backup will be permanently deleted.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteBackup(backup.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="network">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      DHCP Leases
                    </CardTitle>
                    <CardDescription>Active DHCP leases on the router</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {leasesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {(dhcpLeases?.data || []).slice(0, 20).map((lease: any, index: number) => (
                            <div
                              key={lease[".id"]}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                              data-testid={`dhcp-lease-${index}`}
                            >
                              <div>
                                <p className="font-medium">{lease.address}</p>
                                <p className="text-xs text-muted-foreground">
                                  {lease["mac-address"]} | {lease["host-name"] || "Unknown"}
                                </p>
                              </div>
                              <Badge variant={lease.status === "bound" ? "default" : "secondary"}>
                                {lease.status || "active"}
                              </Badge>
                            </div>
                          ))}
                          {(!dhcpLeases?.data || dhcpLeases.data.length === 0) && (
                            <p className="text-center text-muted-foreground py-8">No DHCP leases</p>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="w-5 h-5" />
                      ARP Table
                    </CardTitle>
                    <CardDescription>MAC address to IP mappings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {arpLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {(arpTable?.data || []).slice(0, 20).map((entry: any, index: number) => (
                            <div
                              key={entry[".id"]}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                              data-testid={`arp-entry-${index}`}
                            >
                              <div>
                                <p className="font-medium">{entry.address}</p>
                                <p className="text-xs text-muted-foreground">
                                  {entry["mac-address"]} | {entry.interface}
                                </p>
                              </div>
                              <Badge variant={entry.complete === "true" ? "default" : "secondary"}>
                                {entry.complete === "true" ? "Complete" : "Incomplete"}
                              </Badge>
                            </div>
                          ))}
                          {(!arpTable?.data || arpTable.data.length === 0) && (
                            <p className="text-center text-muted-foreground py-8">No ARP entries</p>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/50 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Simple Queues (Bandwidth Limits)
                    </CardTitle>
                    <CardDescription>Per-user and per-target bandwidth management</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {queuesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {(queues?.data || []).map((queue: any, index: number) => (
                            <div
                              key={queue[".id"]}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                              data-testid={`queue-${index}`}
                            >
                              <div>
                                <p className="font-medium">{queue.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Target: {queue.target} | Limit: {queue["max-limit"] || "unlimited"}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-green-400">
                                  <ArrowDown className="w-3 h-3 inline mr-1" />
                                  {queue.bytes ? formatBytes(parseInt(queue.bytes.split("/")[0] || "0")) : "0 B"}
                                </div>
                                <div className="text-cyan-400">
                                  <ArrowUp className="w-3 h-3 inline mr-1" />
                                  {queue.bytes ? formatBytes(parseInt(queue.bytes.split("/")[1] || "0")) : "0 B"}
                                </div>
                                <Badge variant={queue.disabled === "true" ? "secondary" : "default"}>
                                  {queue.disabled === "true" ? "Disabled" : "Active"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {(!queues?.data || queues.data.length === 0) && (
                            <p className="text-center text-muted-foreground py-8">No queues configured</p>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
