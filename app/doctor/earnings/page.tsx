"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Download, Wallet, DollarSign, TrendingUp, Calendar as CalendarIcon, ArrowUpRight, Check, X, Search, Calculator
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { useDoctor } from "@/contexts/DoctorContext";
import { getDoctorPayments } from "@/lib/doctor/api";
import { isDoctorNetEarning } from "@/lib/doctor/stats";
import { usePaymentsRealtime } from "@/lib/realtime/usePaymentsRealtime";
import { formatCurrency, mapAppointmentType } from "@/lib/doctor/mappers";

interface PayoutRecord {
  id: string;
  period: string;
  grossEarnings: number;
  platformCommission: number;
  netPaid: number;
  status: "Paid" | "Pending";
  datePaid: string;
  reference: string;
}

export default function DoctorEarningsPage() {
  const { doctorProfile } = useDoctor();
  const [timeRange, setTimeRange] = useState<"6months" | "1year">("6months");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [sessionsPerWeek, setSessionsPerWeek] = useState(15);
  const [sessionFee, setSessionFee] = useState(doctorProfile.consultation_fee || 3000);

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [accruedBalance, setAccruedBalance] = useState(0);
  const [clearedTotal, setClearedTotal] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [individualTransactions, setIndividualTransactions] = useState<
    Array<{
      id: string;
      patientName: string;
      date: string;
      gross: number;
      net: number;
      method: string;
      payoutStatus: "Paid" | "Pending";
    }>
  >([]);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<
    Array<{ name: string; gross: number; net: number }>
  >([]);
  const [sourceData, setSourceData] = useState<Array<{ name: string; value: number }>>([]);

  const loadEarnings = async () => {
    setIsLoading(true);
    try {
      const payments = await getDoctorPayments(doctorProfile.id);
      // Only collected (patient-paid) consultations count toward earnings.
      // Exclude payments with active or completed refunds.
      const completed = payments.filter(isDoctorNetEarning);
      const cleared = completed.filter((p) => p.payout_status === "paid");
      const pending = completed.filter((p) => p.payout_status !== "paid");

      // Pending settlement = earned but not yet cleared by admin.
      setAccruedBalance(pending.reduce((sum, p) => sum + Number(p.doctor_earning), 0));
      setClearedTotal(cleared.reduce((sum, p) => sum + Number(p.doctor_earning), 0));
      setTotalEarned(completed.reduce((sum, p) => sum + Number(p.doctor_earning), 0));

      setIndividualTransactions(
        completed.map((p) => ({
          id: p.id.slice(0, 8).toUpperCase(),
          patientName: p.patient?.full_name ?? "Patient",
          date: new Date(p.created_at).toLocaleDateString("en-PK", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          gross: Number(p.amount),
          net: Number(p.doctor_earning),
          method: p.appointment
            ? `${mapAppointmentType(p.appointment.appointment_type)} Consult`
            : "Consultation",
          payoutStatus: p.payout_status === "paid" ? "Paid" : "Pending",
        }))
      );

      const months = timeRange === "1year" ? 12 : 6;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const chartData: Array<{ name: string; gross: number; net: number }> = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthPayments = completed.filter((p) => {
          const created = new Date(p.created_at);
          return (
            created.getFullYear() === date.getFullYear() &&
            created.getMonth() === date.getMonth()
          );
        });
        chartData.push({
          name: monthNames[date.getMonth()],
          gross: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          net: monthPayments.reduce((sum, p) => sum + Number(p.doctor_earning), 0),
        });
      }
      setMonthlyRevenueData(chartData);

      const typeCounts: Record<string, number> = {};
      for (const p of completed) {
        const label = p.appointment
          ? mapAppointmentType(p.appointment.appointment_type)
          : "Other";
        typeCounts[label] = (typeCounts[label] ?? 0) + 1;
      }
      const total = Object.values(typeCounts).reduce((sum, n) => sum + n, 0);
      setSourceData(
        Object.entries(typeCounts).map(([name, value]) => ({
          name,
          value: total > 0 ? Math.round((value / total) * 100) : 0,
        }))
      );

      setPayouts(
        completed.slice(0, 20).map((p) => ({
          id: p.id.slice(0, 8).toUpperCase(),
          period: new Date(p.created_at).toLocaleDateString("en-PK", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          grossEarnings: Number(p.amount),
          platformCommission: Number(p.platform_fee),
          netPaid: Number(p.doctor_earning),
          status: p.payout_status === "paid" ? "Paid" : "Pending",
          datePaid: p.paid_at
            ? new Date(p.paid_at).toLocaleDateString("en-PK", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "—",
          reference: p.payout_reference ?? "—",
        }))
      );
    } catch {
      showToast("Failed to load earnings data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, [doctorProfile.id, timeRange]);

  // Live-sync: when the admin settles a payout, refresh instantly.
  usePaymentsRealtime({ doctorId: doctorProfile.id, onChange: loadEarnings });

  const COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];

  const filteredTransactions = useMemo(
    () =>
      individualTransactions.filter(
        (tx) =>
          tx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.id.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [individualTransactions, searchQuery]
  );


  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleDownloadInvoice = (pay: PayoutRecord) => {
    const lines = [
      ["Field", "Value"],
      ["Receipt / Payout ID", pay.id],
      ["Doctor", doctorProfile.specialization],
      ["Earning Period", pay.period],
      ["Gross Fee (PKR)", String(pay.grossEarnings)],
      ["Platform Commission (PKR)", String(pay.platformCommission)],
      ["Net Disbursement (PKR)", String(pay.netPaid)],
      ["Status", pay.status],
      ["Date Disbursed", pay.datePaid],
      ["Reference", pay.reference],
    ];
    const csv = lines
      .map((row) => row.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${pay.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Receipt ${pay.id} downloaded.`);
  };

  const handleRequestPayout = () => {
    if (accruedBalance <= 0) return;
    showToast("Early disbursal request submitted. Finance team will process within 24 hours.");
    setShowPayoutModal(false);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-muted-foreground" style={{ color: entry.color }}>
              {entry.name}: PKR {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Filter payouts by period or ID
  const filteredPayouts = payouts.filter(p => 
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.period.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium border border-slate-800 animate-in slide-in-from-right duration-200">
          <Check className="h-4 w-4 text-brand-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Description */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Earnings & Finances</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track your consultation fees, request custom payouts, and model weekly earnings.
          </p>
        </div>
        {accruedBalance > 0 && (
          <Button 
            onClick={() => setShowPayoutModal(true)} 
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold"
          >
            Request Payout
          </Button>
        )}
      </div>

      {/* Finances Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-brand-400/10 to-transparent border-brand-400/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
              Pending Settlement
              <Wallet className="h-4 w-4 text-brand-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground">{formatCurrency(accruedBalance)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" /> Earned, awaiting admin clearance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
              Total Earned
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{formatCurrency(totalEarned)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-600" /> Lifetime net of commission
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
              Total Cleared
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(clearedTotal)}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Lifetime payouts settled by admin
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
              Linked Payout Account
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold truncate mt-1">Meezan Bank Ltd.</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono bg-card px-2 py-1 rounded border border-border inline-block">
              IBAN: ...2304
            </p>
            <button 
              onClick={() => showToast("Redirecting to profile console payout settings...")} 
              className="block text-brand-500 hover:text-brand-600 mt-2 text-xs font-semibold cursor-pointer"
            >
              Update bank details
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Calculator & Projection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-brand-500" />
            <div>
              <CardTitle>Clinical Projection Calculator</CardTitle>
              <CardDescription>Plan your weekly sessions and model your monthly take-home revenue after platform commission (10%)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span>Sessions per Week</span>
                  <span className="text-brand-500 font-bold">{sessionsPerWeek} consultations</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="40" 
                  value={sessionsPerWeek} 
                  onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span>Consultation Fee Rate (PKR)</span>
                  <span className="text-brand-500 font-bold">PKR {sessionFee.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="1500" 
                  max="8000" 
                  step="500"
                  value={sessionFee} 
                  onChange={(e) => setSessionFee(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center bg-muted/20 p-4 rounded-xl border border-border">
              <div className="flex flex-col justify-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Monthly Gross</p>
                <p className="text-lg font-bold text-foreground mt-1">
                  PKR {((sessionsPerWeek * sessionFee) * 4).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col justify-center border-x border-border/80 px-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Platform Fee (10%)</p>
                <p className="text-xs font-semibold text-rose-600 mt-1">
                  -PKR {(((sessionsPerWeek * sessionFee) * 4) * 0.1).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Net Take-Home</p>
                <p className="text-lg font-black text-brand-500 mt-1">
                  PKR {(((sessionsPerWeek * sessionFee) * 4) * 0.9).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Gross vs Net earnings over the last 6 months</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={timeRange === "6months" ? "default" : "outline"} 
                size="sm" 
                className={timeRange === "6months" ? "bg-brand-500 text-white hover:bg-brand-600 font-semibold" : "font-semibold"} 
                onClick={() => setTimeRange("6months")}
              >
                6 Months
              </Button>
              <Button 
                variant={timeRange === "1year" ? "default" : "outline"} 
                size="sm" 
                className={timeRange === "1year" ? "bg-brand-500 text-white hover:bg-brand-600 font-semibold" : "font-semibold"} 
                onClick={() => setTimeRange("1year")}
              >
                1 Year
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRevenueData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted/20" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                    className="text-muted-foreground"
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(value) => `PKR ${value / 1000}k`}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="gross" 
                    name="Gross Earnings"
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#94a3b8', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#94a3b8', strokeWidth: 0 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="net" 
                    name="Net Disbursed"
                    stroke="#0d9488" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0d9488', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#0d9488', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Sources Pie Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Income Sources</CardTitle>
            <CardDescription>Breakdown by consultation type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full mt-2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {sourceData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    formatter={(value) => [`${Number(value ?? 0)}%`, "Share"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-foreground">100%</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</span>
              </div>
            </div>
            
            <div className="mt-6 space-y-3">
              {sourceData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual consultation session ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Consultation Billing Ledger</CardTitle>
          <CardDescription>Line item transactions for completed appointments</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Patient Name</th>
                  <th className="px-6 py-4">Date Completed</th>
                  <th className="px-6 py-4">Consultation Mode</th>
                  <th className="px-6 py-4">Gross Fee</th>
                  <th className="px-6 py-4">Net Fee (90%)</th>
                  <th className="px-6 py-4 text-right">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{tx.id}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">{tx.patientName}</td>
                    <td className="px-6 py-4 text-xs">{tx.date}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-brand-500">{tx.method}</td>
                    <td className="px-6 py-4 text-xs">PKR {tx.gross.toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs font-bold text-foreground">PKR {tx.net.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        tx.payoutStatus === "Paid"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                      }`}>
                        {tx.payoutStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground bg-muted/10">
                      No consultations match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payouts list table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
          <div>
            <CardTitle>Disbursal History</CardTitle>
            <CardDescription>Semimonthly automatic and custom payouts history</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search payout ID or period..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-4">Payout ID</th>
                  <th className="px-6 py-4">Earning Period</th>
                  <th className="px-6 py-4">Gross Fees</th>
                  <th className="px-6 py-4">Commission Share</th>
                  <th className="px-6 py-4">Net Disbursement</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date Disbursed</th>
                  <th className="px-6 py-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPayouts.map((pay) => (
                  <tr key={pay.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs">{pay.id}</td>
                    <td className="px-6 py-4 font-medium">{pay.period}</td>
                    <td className="px-6 py-4 text-xs">PKR {pay.grossEarnings.toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">PKR {pay.platformCommission.toLocaleString()}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">PKR {pay.netPaid.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        pay.status === "Paid" 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                      }`}>
                        {pay.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{pay.datePaid}</td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        onClick={() => handleDownloadInvoice(pay)}
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-brand-500 hover:text-brand-600 hover:bg-brand-400/10 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Receipt</span>
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredPayouts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground bg-muted/10">
                      No payout records match your search filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Early Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-sm w-full shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Initiate Early Payout</h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowPayoutModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground">Available for Immediate Disbursal</p>
                <p className="text-3xl font-black text-emerald-600 mt-1">PKR {accruedBalance.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Includes 10% platform commission deduction</p>
              </div>

              <div className="space-y-3 bg-muted/40 p-3 rounded-xl border text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destination Bank:</span>
                  <span className="font-semibold text-foreground">Meezan Bank Ltd.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Holder:</span>
                  <span className="font-semibold text-foreground">Dr. Ayesha Khan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Settlement Time:</span>
                  <span className="font-semibold text-brand-500">Immediate (15 mins)</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowPayoutModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRequestPayout} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold">
                  Confirm Payout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
