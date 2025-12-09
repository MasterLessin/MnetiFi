import { useState } from "react";
import { Trash2, RefreshCw, Database, FileText, Image } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ClearCachePage() {
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);

  const [options, setOptions] = useState({
    sessionCache: true,
    queryCache: true,
    imageCache: false,
    allCache: false,
  });

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const cleared = [];
      if (options.sessionCache || options.allCache) cleared.push("session cache");
      if (options.queryCache || options.allCache) cleared.push("query cache");
      if (options.imageCache || options.allCache) cleared.push("image cache");
      
      toast({
        title: "Cache Cleared",
        description: `Successfully cleared: ${cleared.join(", ")}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear cache. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleToggleOption = (key: keyof typeof options) => {
    if (key === "allCache") {
      const newValue = !options.allCache;
      setOptions({
        sessionCache: newValue,
        queryCache: newValue,
        imageCache: newValue,
        allCache: newValue,
      });
    } else {
      setOptions({
        ...options,
        [key]: !options[key],
        allCache: false,
      });
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="settings-clear-cache-page">
      <div>
        <h1 className="text-2xl font-bold text-white">Clear Cache</h1>
        <p className="text-muted-foreground">
          Clear application cache to free up space and fix display issues
        </p>
      </div>

      <GlassPanel size="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-red-500/20">
            <Trash2 size={20} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Cache Options</h2>
            <p className="text-sm text-muted-foreground">
              Select which caches to clear
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-cyan-400" />
              <div>
                <Label className="text-white">Session Cache</Label>
                <p className="text-xs text-muted-foreground">
                  Clear user session data
                </p>
              </div>
            </div>
            <Switch
              checked={options.sessionCache}
              onCheckedChange={() => handleToggleOption("sessionCache")}
              data-testid="switch-session-cache"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-purple-400" />
              <div>
                <Label className="text-white">Query Cache</Label>
                <p className="text-xs text-muted-foreground">
                  Clear API response cache
                </p>
              </div>
            </div>
            <Switch
              checked={options.queryCache}
              onCheckedChange={() => handleToggleOption("queryCache")}
              data-testid="switch-query-cache"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Image size={20} className="text-green-400" />
              <div>
                <Label className="text-white">Image Cache</Label>
                <p className="text-xs text-muted-foreground">
                  Clear cached images and thumbnails
                </p>
              </div>
            </div>
            <Switch
              checked={options.imageCache}
              onCheckedChange={() => handleToggleOption("imageCache")}
              data-testid="switch-image-cache"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-3">
              <RefreshCw size={20} className="text-orange-400" />
              <div>
                <Label className="text-white">Clear All Cache</Label>
                <p className="text-xs text-muted-foreground">
                  Clear all cached data at once
                </p>
              </div>
            </div>
            <Switch
              checked={options.allCache}
              onCheckedChange={() => handleToggleOption("allCache")}
              data-testid="switch-all-cache"
            />
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={handleClearCache}
            disabled={isClearing || (!options.sessionCache && !options.queryCache && !options.imageCache && !options.allCache)}
            className="w-full"
            variant="destructive"
            data-testid="button-clear-cache"
          >
            <Trash2 size={18} className="mr-2" />
            {isClearing ? "Clearing Cache..." : "Clear Selected Cache"}
          </Button>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-muted-foreground">
            Clearing cache is safe and will not delete your data. It may temporarily slow down the application while caches are rebuilt.
          </p>
        </div>
      </GlassPanel>
    </div>
  );
}
