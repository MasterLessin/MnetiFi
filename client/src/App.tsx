import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { SuperAdminLayout } from "@/layouts/superadmin-layout";
import { TechLayout } from "@/layouts/tech-layout";
import { SettingsLayout } from "@/layouts/settings-layout";
import LandingPage from "@/pages/landing";
import CaptivePortal from "@/pages/captive-portal";
import CustomerPortal from "@/pages/customer-portal";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import VerifyEmailPage from "@/pages/verify-email";
import SuperAdminLoginPage from "@/pages/superadmin-login";
import SuperAdminForgotPasswordPage from "@/pages/superadmin-forgot-password";
import SuperAdminRegisterPage from "@/pages/superadmin-register";
import Dashboard from "@/pages/dashboard";
import PlansPage from "@/pages/plans";
import PPPoEPlansPage from "@/pages/pppoe-plans";
import StaticPlansPage from "@/pages/static-plans";
import HotspotPlansPage from "@/pages/hotspot-plans";
import HotspotsPage from "@/pages/hotspots";
import TransactionsPage from "@/pages/transactions";
import WalledGardenPage from "@/pages/walled-garden-page";
import WifiUsersPage from "@/pages/wifi-users";
import CustomerDetailsPage from "@/pages/customer-details";
import TicketsPage from "@/pages/tickets";
import ReconciliationPage from "@/pages/reconciliation";
import ProfileSettingsPage from "@/pages/settings/profile";
import PaymentGatewayPage from "@/pages/settings/payment-gateway";
import NotificationsSettingsPage from "@/pages/settings/notifications";
import HotspotSettingsPage from "@/pages/settings/hotspot-settings";
import BackupRestorePage from "@/pages/settings/backup-restore";
import MikroTikImportPage from "@/pages/settings/mikrotik-import";
import ClearCachePage from "@/pages/settings/clear-cache";
import SmsCampaignsPage from "@/pages/sms-campaigns";
import NetworkMonitoringPage from "@/pages/network-monitoring";
import VouchersPage from "@/pages/vouchers";
import ReportsPage from "@/pages/reports";
import SuperAdminDashboard from "@/pages/superadmin-dashboard";
import SuperAdminTenantsPage from "@/pages/superadmin-tenants";
import SuperAdminTenantDetailsPage from "@/pages/superadmin-tenant-details";
import SuperAdminUsersPage from "@/pages/superadmin-users";
import TechDashboard from "@/pages/tech-dashboard";
import TechPPPoEUsersPage from "@/pages/tech-pppoe-users";
import TechStaticUsersPage from "@/pages/tech-static-users";
import ZonesPage from "@/pages/zones";
import ChatPage from "@/pages/chat";
import LoyaltyPage from "@/pages/loyalty";
import SecuritySettingsPage from "@/pages/security-settings";
import VoucherVerifyPage from "@/pages/voucher-verify";
import UpgradePage from "@/pages/upgrade";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Landing Page - Official Website */}
      <Route path="/" component={LandingPage} />
      
      {/* Captive Portal - Public facing */}
      <Route path="/portal" component={CaptivePortal} />
      
      {/* Voucher Verification - Public facing */}
      <Route path="/verify-voucher" component={VoucherVerifyPage} />
      
      {/* Customer Portal - Self-service for WiFi users */}
      <Route path="/my-account" component={CustomerPortal} />
      
      {/* Auth Pages */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
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
      <Route path="/dashboard/pppoe-plans">
        {() => (
          <DashboardLayout>
            <PPPoEPlansPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/static-plans">
        {() => (
          <DashboardLayout>
            <StaticPlansPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/hotspot-plans">
        {() => (
          <DashboardLayout>
            <HotspotPlansPage />
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
      <Route path="/dashboard/wifi-users/:id">
        {() => (
          <DashboardLayout>
            <CustomerDetailsPage />
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
        {() => <Redirect to="/dashboard/settings/profile" />}
      </Route>
      <Route path="/dashboard/settings/profile">
        {() => (
          <DashboardLayout>
            <SettingsLayout>
              <ProfileSettingsPage />
            </SettingsLayout>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/settings/hotspot-settings">
        {() => (
          <DashboardLayout>
            <SettingsLayout>
              <HotspotSettingsPage />
            </SettingsLayout>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/settings/payment-gateway">
        {() => (
          <DashboardLayout>
            <SettingsLayout>
              <PaymentGatewayPage />
            </SettingsLayout>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/settings/backup-restore">
        {() => (
          <DashboardLayout>
            <SettingsLayout>
              <BackupRestorePage />
            </SettingsLayout>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/settings/notifications">
        {() => (
          <DashboardLayout>
            <SettingsLayout>
              <NotificationsSettingsPage />
            </SettingsLayout>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/settings/mikrotik-import">
        {() => (
          <DashboardLayout>
            <SettingsLayout>
              <MikroTikImportPage />
            </SettingsLayout>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/settings/clear-cache">
        {() => (
          <DashboardLayout>
            <SettingsLayout>
              <ClearCachePage />
            </SettingsLayout>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/sms-campaigns">
        {() => (
          <DashboardLayout>
            <SmsCampaignsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/network-monitoring">
        {() => (
          <DashboardLayout>
            <NetworkMonitoringPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/vouchers">
        {() => (
          <DashboardLayout>
            <VouchersPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/reports">
        {() => (
          <DashboardLayout>
            <ReportsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/zones">
        {() => (
          <DashboardLayout>
            <ZonesPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/chat">
        {() => (
          <DashboardLayout>
            <ChatPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/loyalty">
        {() => (
          <DashboardLayout>
            <LoyaltyPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/security">
        {() => (
          <DashboardLayout>
            <SecuritySettingsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/upgrade">
        {() => (
          <DashboardLayout>
            <UpgradePage />
          </DashboardLayout>
        )}
      </Route>

      {/* Super Admin Auth Pages */}
      <Route path="/superadmin/login" component={SuperAdminLoginPage} />
      <Route path="/superadmin/register" component={SuperAdminRegisterPage} />
      <Route path="/superadmin/forgot-password" component={SuperAdminForgotPasswordPage} />

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
      <Route path="/superadmin/tenants/:id">
        {() => (
          <SuperAdminLayout>
            <SuperAdminTenantDetailsPage />
          </SuperAdminLayout>
        )}
      </Route>
      <Route path="/superadmin/users">
        {() => (
          <SuperAdminLayout>
            <SuperAdminUsersPage />
          </SuperAdminLayout>
        )}
      </Route>

      {/* Tech Portal Routes */}
      <Route path="/tech">
        {() => (
          <TechLayout>
            <TechDashboard />
          </TechLayout>
        )}
      </Route>
      <Route path="/tech/pppoe-users">
        {() => (
          <TechLayout>
            <TechPPPoEUsersPage />
          </TechLayout>
        )}
      </Route>
      <Route path="/tech/static-users">
        {() => (
          <TechLayout>
            <TechStaticUsersPage />
          </TechLayout>
        )}
      </Route>
      <Route path="/tech/customers">
        {() => (
          <TechLayout>
            <WifiUsersPage />
          </TechLayout>
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
