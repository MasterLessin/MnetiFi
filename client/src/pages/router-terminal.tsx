import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Terminal, Send, Trash2, Copy, Router, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Hotspot } from "@shared/schema";

interface CommandResult {
  id: string;
  command: string;
  output: any;
  success: boolean;
  error?: string;
  timestamp: string;
}

interface PredefinedCommand {
  label: string;
  command: string;
  description: string;
}

interface CommandCategory {
  category: string;
  commands: PredefinedCommand[];
}

export default function RouterTerminalPage() {
  const { toast } = useToast();
  const [selectedRouter, setSelectedRouter] = useState<string>("");
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<CommandResult[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["System", "Hotspot"]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch routers (hotspots)
  const { data: routers } = useQuery<Hotspot[]>({
    queryKey: ["/api/hotspots"],
  });

  // Fetch predefined commands
  const { data: predefinedCommands } = useQuery<CommandCategory[]>({
    queryKey: ["/api/terminal/commands"],
  });

  // Execute command mutation
  const executeMutation = useMutation({
    mutationFn: async ({ hotspotId, command }: { hotspotId: string; command: string }) => {
      return apiRequest("POST", "/api/terminal/execute", { hotspotId, command });
    },
    onSuccess: (data: any) => {
      const result: CommandResult = {
        id: Date.now().toString(),
        command: data.command,
        output: data.output || data.error,
        success: data.success,
        error: data.error,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      setHistory((prev) => [...prev, result]);
      setCommand("");
    },
    onError: (error: Error) => {
      const result: CommandResult = {
        id: Date.now().toString(),
        command,
        output: null,
        success: false,
        error: error.message || "Failed to execute command",
        timestamp: new Date().toISOString(),
      };
      setHistory((prev) => [...prev, result]);
      toast({
        title: "Command Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const handleExecute = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedRouter) {
      toast({
        title: "Select a Router",
        description: "Please select a router before executing commands",
        variant: "destructive",
      });
      return;
    }
    if (!command.trim()) return;
    
    executeMutation.mutate({ hotspotId: selectedRouter, command: command.trim() });
  };

  const handleQuickCommand = (cmd: string) => {
    if (!selectedRouter) {
      toast({
        title: "Select a Router",
        description: "Please select a router before executing commands",
        variant: "destructive",
      });
      return;
    }
    executeMutation.mutate({ hotspotId: selectedRouter, command: cmd });
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const copyOutput = (output: any) => {
    const text = typeof output === "object" ? JSON.stringify(output, null, 2) : String(output);
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Output copied to clipboard",
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const formatOutput = (output: any): string => {
    if (!output) return "No output";
    if (typeof output === "string") return output;
    if (Array.isArray(output)) {
      if (output.length === 0) return "Empty result";
      return JSON.stringify(output, null, 2);
    }
    return JSON.stringify(output, null, 2);
  };

  const selectedRouterName = routers?.find((r) => r.id === selectedRouter)?.locationName || "No router selected";

  return (
    <div className="p-6 h-full flex flex-col gap-6" data-testid="router-terminal-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal size={28} className="text-cyan-400" />
            RouterOS Terminal
          </h1>
          <p className="text-muted-foreground">
            Execute MikroTik RouterOS commands directly on your routers
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedRouter} onValueChange={setSelectedRouter}>
            <SelectTrigger className="w-[220px] bg-white/5 border-white/10" data-testid="select-router">
              <Router size={16} className="mr-2 text-cyan-400" />
              <SelectValue placeholder="Select Router" />
            </SelectTrigger>
            <SelectContent>
              {routers?.map((router) => (
                <SelectItem key={router.id} value={router.id}>
                  {router.locationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            disabled={history.length === 0}
            data-testid="button-clear-terminal"
          >
            <Trash2 size={16} className="mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Command Sidebar */}
        <div className="w-72 flex-shrink-0">
          <GlassPanel className="h-full overflow-auto">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              Quick Commands
            </h3>
            
            <div className="space-y-2">
              {predefinedCommands?.map((category) => (
                <Collapsible
                  key={category.category}
                  open={expandedCategories.includes(category.category)}
                  onOpenChange={() => toggleCategory(category.category)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-white/5 text-left">
                    {expandedCategories.includes(category.category) ? (
                      <ChevronDown size={14} className="text-muted-foreground" />
                    ) : (
                      <ChevronRight size={14} className="text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-white">{category.category}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {category.commands.length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 space-y-1">
                    {category.commands.map((cmd, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickCommand(cmd.command)}
                        className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors group"
                        disabled={executeMutation.isPending || !selectedRouter}
                        data-testid={`quick-cmd-${category.category}-${idx}`}
                      >
                        <div className="text-sm text-cyan-400 group-hover:text-cyan-300">
                          {cmd.label}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {cmd.description}
                        </div>
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* Terminal Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <GlassPanel className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-black/20">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                {selectedRouterName}
              </span>
              {selectedRouter && (
                <Badge variant="outline" className="ml-auto text-xs">
                  Connected
                </Badge>
              )}
            </div>

            {/* Terminal Output */}
            <div
              ref={terminalRef}
              className="flex-1 overflow-auto p-4 font-mono text-sm bg-black/40"
              onClick={() => inputRef.current?.focus()}
            >
              {history.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">
                  <Terminal size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Select a router and start executing commands</p>
                  <p className="text-xs mt-2">Use quick commands on the left or type your own below</p>
                </div>
              ) : (
                history.map((result) => (
                  <div key={result.id} className="mb-4">
                    {/* Command line */}
                    <div className="flex items-center gap-2 text-cyan-400">
                      <span className="text-green-400">[admin@MikroTik]</span>
                      <span className="text-white">&gt;</span>
                      <span>{result.command}</span>
                    </div>
                    
                    {/* Output */}
                    <div className="mt-1 pl-4 relative group">
                      {result.success ? (
                        <pre className="text-green-300 whitespace-pre-wrap overflow-x-auto text-xs">
                          {formatOutput(result.output)}
                        </pre>
                      ) : (
                        <div className="flex items-start gap-2 text-red-400">
                          <XCircle size={14} className="mt-0.5 flex-shrink-0" />
                          <span className="text-xs">{result.error || "Command failed"}</span>
                        </div>
                      )}
                      
                      {/* Copy button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyOutput(result.output || result.error)}
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="text-xs text-muted-foreground mt-1 pl-4">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
              
              {executeMutation.isPending && (
                <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
                  <span className="text-green-400">[admin@MikroTik]</span>
                  <span className="text-white">&gt;</span>
                  <span>{command}</span>
                  <span className="ml-2">Executing...</span>
                </div>
              )}
            </div>

            {/* Command Input */}
            <form onSubmit={handleExecute} className="flex items-center gap-2 p-3 border-t border-white/10 bg-black/30">
              <span className="text-green-400 font-mono text-sm">[admin@MikroTik]</span>
              <span className="text-white font-mono">&gt;</span>
              <Input
                ref={inputRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={selectedRouter ? "Enter RouterOS command..." : "Select a router first"}
                className="flex-1 bg-transparent border-none focus-visible:ring-0 font-mono text-sm text-white placeholder:text-muted-foreground"
                disabled={!selectedRouter || executeMutation.isPending}
                data-testid="input-command"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!selectedRouter || !command.trim() || executeMutation.isPending}
                className="gradient-btn"
                data-testid="button-execute"
              >
                <Send size={14} className="mr-1" />
                Execute
              </Button>
            </form>
          </GlassPanel>

          {/* Warning Banner */}
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200/80">
              Commands are executed directly on the router. Some dangerous commands are blocked for security.
              Always verify commands before execution. Changes may affect network connectivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
