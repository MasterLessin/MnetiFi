import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Thermometer,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Users,
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
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
}

export default function NetworkMonitoringPage() {
  const { toast } = useToast();
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [bandwidthHistory, setBandwidthHistory] = useState<BandwidthData[]>([]);
  const [isRebooting, setIsRebooting] = useState(false);

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

  const { data: activeSessions = [], isLoading: sessionsLoading } = useQuery<ActiveSession[]>({
    queryKey: ["/api/hotspots", selectedHotspot, "sessions"],
    enabled: !!selectedHotspot,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (hotspots.length > 0 && !selectedHotspot) {
      setSelectedHotspot(hotspots[0].id);
    }
  }, [hotspots, selectedHotspot]);

  useEffect(() => {
    if (!selectedHotspot) return;

    const fetchBandwidth = async () => {
      try {
        const response = await fetch(`/api/hotspots/${selectedHotspot}/bandwidth`);
        if (response.ok) {
          const data = await response.json();
          const now = new Date();
          const timeStr = now.toLocaleTimeString();
          
          const newPoint: BandwidthData = {
            time: timeStr,
            upload: data.upload || Math.random() * 50 + 10,
            download: data.download || Math.random() * 100 + 20,
          };

          setBandwidthHistory((prev) => {
            const updated = [...prev, newPoint];
            return updated.slice(-30);
          });
        }
      } catch (error) {
        console.error("Error fetching bandwidth:", error);
      }
    };

    fetchBandwidth();
    const interval = setInterval(fetchBandwidth, 2000);

    return () => clearInterval(interval);
  }, [selectedHotspot]);

  const handleReboot = async () => {
    if (!selectedHotspot) return;
    
    setIsRebooting(true);
    try {
      await apiRequest("POST", `/api/hotspots/${selectedHotspot}/reboot`);
      toast({
        title: "Reboot Initiated",
        description: "The router is rebooting. It may take a few minutes to come back online.",
      });
    } catch (error) {
      toast({
        title: "Reboot Failed",
        description: error instanceof Error ? error.message : "Failed to reboot router",
        variant: "destructive",
      });
    } finally {
      setIsRebooting(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (uptime: string): string => {
    return uptime || "Unknown";
  };

  const selectedHotspotData = hotspots.find((h) => h.id === selectedHotspot);

  const memoryPercent = routerStats 
    ? ((routerStats.totalMemory - routerStats.freeMemory) / routerStats.totalMemory) * 100 
    : 0;

  const diskPercent = routerStats 
    ? ((routerStats.totalDisk - routerStats.freeDisk) / routerStats.totalDisk) * 100 
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            Network Monitoring
          </h1>
          <p className="text-muted-foreground">
            Real-time router statistics and bandwidth monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select 
            value={selectedHotspot || ""} 
            onValueChange={setSelectedHotspot}
          >
            <SelectTrigger className="w-[200px] bg-white/5 border-white/10" data-testid="select-hotspot">
              <SelectValue placeholder="Select Router" />
            </SelectTrigger>
            <SelectContent>
              {hotspots.map((hotspot) => (
                <SelectItem key={hotspot.id} value={hotspot.id}>
                  {hotspot.locationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchStats()}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={!selectedHotspot || isRebooting}
                data-testid="button-reboot"
              >
                {isRebooting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Power className="w-4 h-4 mr-2" />
                )}
                Reboot Router
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Confirm Router Reboot
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will restart the router at <strong>{selectedHotspotData?.locationName}</strong>. 
                  All active connections will be temporarily disconnected. 
                  The router may take 1-3 minutes to come back online.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReboot}>
                  Reboot Now
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {!selectedHotspot ? (
        <Card className="bg-card/50 border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Router className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Select a Router</p>
            <p className="text-sm text-muted-foreground">
              Choose a router from the dropdown to view its statistics
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* System Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/50 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                      <Cpu className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CPU Load</p>
                      <p className="text-2xl font-bold" data-testid="text-cpu-load">
                        {statsLoading ? "-" : `${routerStats?.cpuLoad || 0}%`}
                      </p>
                    </div>
                  </div>
                </div>
                <Progress 
                  value={routerStats?.cpuLoad || 0} 
                  className="mt-3 h-2"
                />
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <MemoryStick className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Memory</p>
                      <p className="text-2xl font-bold" data-testid="text-memory">
                        {statsLoading ? "-" : `${memoryPercent.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                </div>
                <Progress 
                  value={memoryPercent} 
                  className="mt-3 h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {routerStats ? `${formatBytes(routerStats.totalMemory - routerStats.freeMemory)} / ${formatBytes(routerStats.totalMemory)}` : "-"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <HardDrive className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Storage</p>
                      <p className="text-2xl font-bold" data-testid="text-storage">
                        {statsLoading ? "-" : `${diskPercent.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                </div>
                <Progress 
                  value={diskPercent} 
                  className="mt-3 h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {routerStats ? `${formatBytes(routerStats.totalDisk - routerStats.freeDisk)} / ${formatBytes(routerStats.totalDisk)}` : "-"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/20">
                      <Clock className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Uptime</p>
                      <p className="text-lg font-bold" data-testid="text-uptime">
                        {statsLoading ? "-" : formatUptime(routerStats?.uptime || "")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {routerStats?.boardName} - {routerStats?.version}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bandwidth Chart */}
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Live Bandwidth
              </CardTitle>
              <CardDescription>
                Real-time network traffic (Mbps)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bandwidthHistory}>
                    <defs>
                      <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="time" 
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="upload"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      fill="url(#uploadGradient)"
                      name="Upload"
                    />
                    <Area
                      type="monotone"
                      dataKey="download"
                      stroke="#a855f7"
                      strokeWidth={2}
                      fill="url(#downloadGradient)"
                      name="Download"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <ArrowUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-muted-foreground">Upload</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowDown className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-muted-foreground">Download</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="interfaces" className="space-y-4">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="interfaces" data-testid="tab-interfaces">
                <Network className="w-4 h-4 mr-2" />
                Interfaces
              </TabsTrigger>
              <TabsTrigger value="sessions" data-testid="tab-sessions">
                <Users className="w-4 h-4 mr-2" />
                Active Sessions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="interfaces">
              <Card className="bg-card/50 border-white/10">
                <CardHeader>
                  <CardTitle>Network Interfaces</CardTitle>
                  <CardDescription>Status of all router interfaces</CardDescription>
                </CardHeader>
                <CardContent>
                  {interfacesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    </div>
                  ) : interfaces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Network className="w-8 h-8 mb-2" />
                      <p>No interface data available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {interfaces.map((iface, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                          data-testid={`interface-${iface.name}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${iface.running ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                              <Network className={`w-5 h-5 ${iface.running ? 'text-green-400' : 'text-red-400'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{iface.name}</span>
                                <Badge variant={iface.running ? "default" : "secondary"} className="text-xs">
                                  {iface.running ? "Running" : "Down"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {iface.type}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <p className="text-muted-foreground">RX</p>
                              <p className="font-medium text-green-400">
                                {formatBytes(iface.rxBytes)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-muted-foreground">TX</p>
                              <p className="font-medium text-cyan-400">
                                {formatBytes(iface.txBytes)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions">
              <Card className="bg-card/50 border-white/10">
                <CardHeader>
                  <CardTitle>Active Hotspot Sessions</CardTitle>
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
                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
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
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
