import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import CaptivePortal from "@/pages/captive-portal";
import Dashboard from "@/pages/dashboard";
import PlansPage from "@/pages/plans";
import HotspotsPage from "@/pages/hotspots";
import TransactionsPage from "@/pages/transactions";
import WalledGardenPage from "@/pages/walled-garden-page";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Captive Portal - Public facing */}
      <Route path="/" component={CaptivePortal} />
      <Route path="/portal" component={CaptivePortal} />

      {/* Dashboard Routes - Admin area */}
      <Route path="/dashboard">
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/plans">
        {() => (
          <DashboardLayout>
            <PlansPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/hotspots">
        {() => (
          <DashboardLayout>
            <HotspotsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/transactions">
        {() => (
          <DashboardLayout>
            <TransactionsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/walled-garden">
        {() => (
          <DashboardLayout>
            <WalledGardenPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/settings">
        {() => (
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        )}
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
