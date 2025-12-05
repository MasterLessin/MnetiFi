import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { SuperAdminLayout } from "@/layouts/superadmin-layout";
import CaptivePortal from "@/pages/captive-portal";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import PlansPage from "@/pages/plans";
import HotspotsPage from "@/pages/hotspots";
import TransactionsPage from "@/pages/transactions";
import WalledGardenPage from "@/pages/walled-garden-page";
import WifiUsersPage from "@/pages/wifi-users";
import TicketsPage from "@/pages/tickets";
import ReconciliationPage from "@/pages/reconciliation";
import SettingsPage from "@/pages/settings";
import SuperAdminDashboard from "@/pages/superadmin-dashboard";
import SuperAdminTenantsPage from "@/pages/superadmin-tenants";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Captive Portal - Public facing */}
      <Route path="/" component={CaptivePortal} />
      <Route path="/portal" component={CaptivePortal} />
      
      {/* Auth Pages */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />

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
      <Route path="/dashboard/wifi-users">
        {() => (
          <DashboardLayout>
            <WifiUsersPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/tickets">
        {() => (
          <DashboardLayout>
            <TicketsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/reconciliation">
        {() => (
          <DashboardLayout>
            <ReconciliationPage />
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

      {/* Super Admin Routes */}
      <Route path="/superadmin">
        {() => (
          <SuperAdminLayout>
            <SuperAdminDashboard />
          </SuperAdminLayout>
        )}
      </Route>
      <Route path="/superadmin/tenants">
        {() => (
          <SuperAdminLayout>
            <SuperAdminTenantsPage />
          </SuperAdminLayout>
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
