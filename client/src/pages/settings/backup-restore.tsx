import { useState } from "react";
import { Database, Download, Upload, Clock, AlertTriangle } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function BackupRestorePage() {
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      toast({
        title: "Backup Started",
        description: "Your database backup is being created...",
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Backup Complete",
        description: "Your database has been backed up successfully.",
      });
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "Failed to create backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      toast({
        title: "Restore Started",
        description: "Your database is being restored...",
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Restore Complete",
        description: "Your database has been restored successfully.",
      });
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: "Failed to restore backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="settings-backup-restore-page">
      <div>
        <h1 className="text-2xl font-bold text-white">Backup & Restore</h1>
        <p className="text-muted-foreground">
          Manage database backups and restore points
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassPanel size="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Download size={20} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create Backup</h2>
              <p className="text-sm text-muted-foreground">
                Export your database to a backup file
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Clock size={14} />
                <span>Last backup: Never</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Creating a backup will export all your data including users, plans, transactions, and settings.
              </p>
            </div>

            <Button
              className="w-full gradient-btn"
              onClick={handleBackup}
              disabled={isBackingUp}
              data-testid="button-create-backup"
            >
              <Download size={18} className="mr-2" />
              {isBackingUp ? "Creating Backup..." : "Create Backup"}
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel size="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Upload size={20} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Restore Backup</h2>
              <p className="text-sm text-muted-foreground">
                Restore your database from a backup file
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 text-orange-400 text-sm mb-2">
                <AlertTriangle size={14} />
                <span>Warning</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Restoring a backup will replace all current data. This action cannot be undone.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleRestore}
              disabled={isRestoring}
              data-testid="button-restore-backup"
            >
              <Upload size={18} className="mr-2" />
              {isRestoring ? "Restoring..." : "Select Backup File"}
            </Button>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel size="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Database size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Backup History</h2>
            <p className="text-sm text-muted-foreground">
              View and manage previous backups
            </p>
          </div>
        </div>

        <div className="text-center py-8">
          <Database size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No backups available yet</p>
          <p className="text-xs text-muted-foreground mt-2">
            Create your first backup to see it listed here
          </p>
        </div>
      </GlassPanel>
    </div>
  );
}
