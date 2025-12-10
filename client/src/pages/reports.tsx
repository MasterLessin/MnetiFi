import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Users, 
  CreditCard, 
  FileCheck,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FinancialReport {
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    averageTransactionValue: number;
  };
  dailyRevenue: Array<{ date: string; amount: number }>;
  planRevenue: Array<{ name: string; amount: number; count: number }>;
}

interface ReconciliationReport {
  summary: {
    totalTransactions: number;
    matchedCount: number;
    unmatchedCount: number;
    manualReviewCount: number;
    pendingCount: number;
    matchRate: number;
  };
  transactions: Array<{
    id: string;
    amount: number;
    status: string;
    reconciliationStatus: string;
    mpesaReceiptNumber: string | null;
    createdAt: string;
  }>;
}

interface UserActivityReport {
  summary: {
    totalUsers: number;
    activeUsers: number;
    expiredUsers: number;
    suspendedUsers: number;
    expiringIn24h: number;
    expiringIn48h: number;
  };
  expiringUsers: Array<{
    id: string;
    username: string;
    expiryTime: string;
    phoneNumber: string;
  }>;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("financial");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: financialReport, isLoading: financialLoading } = useQuery<FinancialReport>({
    queryKey: ["/api/reports/financial", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const res = await fetch(`/api/reports/financial?${params}`);
      if (!res.ok) throw new Error("Failed to fetch financial report");
      return res.json();
    },
  });

  const { data: reconciliationReport, isLoading: reconciliationLoading } = useQuery<ReconciliationReport>({
    queryKey: ["/api/reports/reconciliation", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const res = await fetch(`/api/reports/reconciliation?${params}`);
      if (!res.ok) throw new Error("Failed to fetch reconciliation report");
      return res.json();
    },
  });

  const { data: userActivityReport, isLoading: userActivityLoading } = useQuery<UserActivityReport>({
    queryKey: ["/api/reports/user-activity"],
  });

  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString()}`;

  const formatCSVValue = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (val instanceof Date) return val.toISOString();
    if (typeof val === "object") return JSON.stringify(val);
    const strVal = String(val);
    if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
      return `"${strVal.replace(/"/g, '""')}"`;
    }
    return strVal;
  };

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => formatCSVValue(row[h])).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportToExcel = (data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const escapeXml = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      return String(val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };
    
    const rows = data.map(row => 
      `<Row>${headers.map(h => {
        const val = row[h];
        const cellType = typeof val === "number" ? "Number" : "String";
        return `<Cell><Data ss:Type="${cellType}">${escapeXml(val)}</Data></Cell>`;
      }).join("")}</Row>`
    ).join("\n");
    
    const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Report">
<Table>
<Row>${headers.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>
${rows}
</Table>
</Worksheet>
</Workbook>`;
    
    const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
  };

  type ExportFormat = "csv" | "excel";
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");

  const exportData = (data: Record<string, unknown>[], filename: string) => {
    if (exportFormat === "excel") {
      exportToExcel(data, filename);
    } else {
      exportToCSV(data, filename);
    }
  };

  const exportFinancialReport = () => {
    if (!financialReport) return;
    
    const data = financialReport.dailyRevenue.map(d => ({
      Date: d.date,
      Revenue: d.amount,
    }));
    exportToCSV(data, "financial_report");
  };

  const exportPlanPerformance = () => {
    if (!financialReport) return;
    
    const data = financialReport.planRevenue.map((p, idx) => ({
      Plan: p.name || `Plan ${idx + 1}`,
      Revenue: p.amount,
      Transactions: p.count,
    }));
    exportToCSV(data, "plan_performance");
  };

  const exportReconciliation = () => {
    if (!reconciliationReport) return;
    
    const data = reconciliationReport.transactions.map(t => ({
      ID: t.id,
      Amount: t.amount,
      Status: t.status,
      ReconciliationStatus: t.reconciliationStatus,
      MpesaReceipt: t.mpesaReceiptNumber || "",
      Date: t.createdAt,
    }));
    exportToCSV(data, "reconciliation_report");
  };

  const exportUserActivity = () => {
    if (!userActivityReport) return;
    
    const data = userActivityReport.expiringUsers.map(u => ({
      Username: u.username,
      Phone: u.phoneNumber,
      ExpiryDate: u.expiryTime,
    }));
    exportToCSV(data, "expiring_users");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            View revenue reports, user activity, and reconciliation status
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={18} />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(today.getDate() - 30);
                setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
                setEndDate(today.toISOString().split("T")[0]);
              }}
              data-testid="button-last-30-days"
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(today.getDate() - 7);
                setStartDate(sevenDaysAgo.toISOString().split("T")[0]);
                setEndDate(today.toISOString().split("T")[0]);
              }}
              data-testid="button-last-7-days"
            >
              Last 7 Days
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border">
          <TabsTrigger value="financial" className="gap-2" data-testid="tab-financial">
            <TrendingUp size={16} />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2" data-testid="tab-plans">
            <BarChart3 size={16} />
            Plan Performance
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
            <Users size={16} />
            User Activity
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-2" data-testid="tab-reconciliation">
            <FileCheck size={16} />
            Reconciliation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          {financialLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin mr-2" />
              Loading financial report...
            </div>
          ) : financialReport ? (
            <>
              <div className="flex justify-end">
                <Button onClick={exportFinancialReport} variant="outline" data-testid="button-export-financial">
                  <Download size={16} className="mr-2" />
                  Export CSV
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-2xl" data-testid="text-total-revenue">
                      {formatCurrency(financialReport.summary.totalRevenue)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Transactions</CardDescription>
                    <CardTitle className="text-2xl" data-testid="text-total-transactions">
                      {financialReport.summary.totalTransactions}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Completed</CardDescription>
                    <CardTitle className="text-2xl text-green-600" data-testid="text-completed-transactions">
                      {financialReport.summary.successfulTransactions}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Avg. Transaction</CardDescription>
                    <CardTitle className="text-2xl" data-testid="text-avg-transaction">
                      {formatCurrency(financialReport.summary.averageTransactionValue)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  {financialReport.dailyRevenue.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialReport.dailyRevenue.map((day) => (
                          <TableRow key={day.date} data-testid={`row-revenue-${day.date}`}>
                            <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(day.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No revenue data for selected period
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No financial data available
            </p>
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          {financialLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin mr-2" />
              Loading plan performance...
            </div>
          ) : financialReport?.planRevenue ? (
            <>
              <div className="flex justify-end">
                <Button onClick={exportPlanPerformance} variant="outline" data-testid="button-export-plans">
                  <Download size={16} className="mr-2" />
                  Export CSV
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Plan Performance</CardTitle>
                  <CardDescription>Revenue and transaction count by plan</CardDescription>
                </CardHeader>
                <CardContent>
                  {financialReport.planRevenue.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan Name</TableHead>
                          <TableHead className="text-right">Transactions</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialReport.planRevenue.map((plan, idx) => (
                          <TableRow key={plan.name || idx} data-testid={`row-plan-${idx}`}>
                            <TableCell className="font-medium">{plan.name}</TableCell>
                            <TableCell className="text-right">{plan.count}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(plan.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No plan data for selected period
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No plan data available
            </p>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {userActivityLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin mr-2" />
              Loading user activity...
            </div>
          ) : userActivityReport ? (
            <>
              <div className="flex justify-end">
                <Button onClick={exportUserActivity} variant="outline" data-testid="button-export-users">
                  <Download size={16} className="mr-2" />
                  Export Expiring Users
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Users</CardDescription>
                    <CardTitle className="text-2xl" data-testid="text-total-users">
                      {userActivityReport.summary.totalUsers}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Active Users</CardDescription>
                    <CardTitle className="text-2xl text-green-600" data-testid="text-active-users">
                      {userActivityReport.summary.activeUsers}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Expired Users</CardDescription>
                    <CardTitle className="text-2xl text-red-600" data-testid="text-expired-users">
                      {userActivityReport.summary.expiredUsers}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card className="border-amber-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle size={18} />
                    Expiring Soon
                  </CardTitle>
                  <CardDescription>
                    {userActivityReport.summary.expiringIn24h} users expiring in 24h, 
                    {" "}{userActivityReport.summary.expiringIn48h} in 48h
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userActivityReport.expiringUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Expiry Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userActivityReport.expiringUsers.slice(0, 10).map((user) => (
                          <TableRow key={user.id} data-testid={`row-expiring-${user.id}`}>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>{user.phoneNumber}</TableCell>
                            <TableCell>
                              {new Date(user.expiryTime).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No users expiring soon
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No user activity data available
            </p>
          )}
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          {reconciliationLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin mr-2" />
              Loading reconciliation report...
            </div>
          ) : reconciliationReport ? (
            <>
              <div className="flex justify-end">
                <Button onClick={exportReconciliation} variant="outline" data-testid="button-export-reconciliation">
                  <Download size={16} className="mr-2" />
                  Export CSV
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Transactions</CardDescription>
                    <CardTitle className="text-2xl" data-testid="text-recon-total">
                      {reconciliationReport.summary.totalTransactions}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      <CheckCircle size={14} className="text-green-600" />
                      Matched
                    </CardDescription>
                    <CardTitle className="text-2xl text-green-600" data-testid="text-recon-matched">
                      {reconciliationReport.summary.matchedCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      <AlertTriangle size={14} className="text-amber-600" />
                      Needs Review
                    </CardDescription>
                    <CardTitle className="text-2xl text-amber-600" data-testid="text-recon-review">
                      {reconciliationReport.summary.manualReviewCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      <Clock size={14} className="text-blue-600" />
                      Pending
                    </CardDescription>
                    <CardTitle className="text-2xl text-blue-600" data-testid="text-recon-pending">
                      {reconciliationReport.summary.pendingCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Match Rate</CardTitle>
                  <CardDescription>
                    {reconciliationReport.summary.matchRate.toFixed(1)}% of transactions matched
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div 
                      className="bg-green-600 h-4 rounded-full transition-all"
                      style={{ width: `${reconciliationReport.summary.matchRate}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {reconciliationReport.transactions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reconciliation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reconciliationReport.transactions.slice(0, 10).map((tx) => (
                          <TableRow key={tx.id} data-testid={`row-recon-${tx.id}`}>
                            <TableCell>
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(tx.amount)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {tx.mpesaReceiptNumber || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={tx.status === "COMPLETED" ? "default" : "secondary"}>
                                {tx.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={tx.reconciliationStatus === "MATCHED" ? "default" : "outline"}
                                className={
                                  tx.reconciliationStatus === "MATCHED" 
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                                    : tx.reconciliationStatus === "MANUAL_REVIEW"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                    : ""
                                }
                              >
                                {tx.reconciliationStatus}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No transactions for selected period
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No reconciliation data available
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
