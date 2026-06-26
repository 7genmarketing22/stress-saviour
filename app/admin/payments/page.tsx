"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download, TrendingUp, DollarSign, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

export default function AdminPaymentsPage() {
  const transactions = [
    {
      id: "TXN-78564123",
      patientName: "Saim Salman",
      doctorName: "Dr. Bilal Ahmed",
      amount: "PKR 2,500",
      commission: "PKR 250",
      doctorShare: "PKR 2,250",
      date: "June 15, 2026",
      method: "EasyPaisa",
      status: "Disbursed",
    },
    {
      id: "TXN-12457896",
      patientName: "Saim Salman",
      doctorName: "Dr. Ayesha Khan",
      amount: "PKR 2,000",
      commission: "PKR 200",
      doctorShare: "PKR 1,800",
      date: "June 08, 2026",
      method: "JazzCash",
      status: "Disbursed",
    },
    {
      id: "TXN-09923847",
      patientName: "Zainab Malik",
      doctorName: "Dr. Farah Jamil",
      amount: "PKR 3,000",
      commission: "PKR 300",
      doctorShare: "PKR 2,700",
      date: "June 02, 2026",
      method: "Card",
      status: "Pending",
    },
  ];

  const financialData = [
    { name: "Jan", volume: 120000, commission: 12000 },
    { name: "Feb", volume: 150000, commission: 15000 },
    { name: "Mar", volume: 180000, commission: 18000 },
    { name: "Apr", volume: 160000, commission: 16000 },
    { name: "May", volume: 210000, commission: 21000 },
    { name: "Jun", volume: 245000, commission: 24500 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}:</span>
              </span>
              <span className="font-semibold">PKR {entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financial Oversight</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Audit client payments, calculate platform commission revenue, and track doctor payouts.
          </p>
        </div>
        <Button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900">
          <Download className="h-4 w-4" />
          Export Ledger
        </Button>
      </div>

      {/* Financial stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Gross Platform Volume
              <Activity className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">PKR 1,065,000</p>
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +16.6% vs last period
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Commission Revenue (10%)
              <DollarSign className="h-4 w-4 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">PKR 106,500</p>
            <p className="text-xs text-muted-foreground mt-2">Net platform earnings (YTD)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Pending Payouts
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">PKR 45,000</p>
            <p className="text-xs text-muted-foreground mt-2">To be paid out next cycle</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Volume Bar Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Gross Volume</CardTitle>
              <CardDescription>Total transaction value processed</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
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
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                  <Bar 
                    dataKey="volume" 
                    name="Gross Volume" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Commission Revenue Line Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Platform Commission</CardTitle>
              <CardDescription>Net revenue from 10% platform fee</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={financialData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
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
                  <Line 
                    type="monotone" 
                    dataKey="commission" 
                    name="Net Commission"
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Transactions Log</CardTitle>
            <CardDescription>Auditable record of all platform bookings</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8">View All Records</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-4">Txn ID</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Doctor</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Fee (10%)</th>
                  <th className="px-6 py-4">Dr Share</th>
                  <th className="px-6 py-4">Payout Status</th>
                  <th className="px-6 py-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs">{tx.id}</td>
                    <td className="px-6 py-4 font-medium">{tx.patientName}</td>
                    <td className="px-6 py-4">{tx.doctorName}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{tx.date}</td>
                    <td className="px-6 py-4 font-semibold">{tx.amount}</td>
                    <td className="px-6 py-4 text-xs text-indigo-600 dark:text-indigo-400 font-medium">{tx.commission}</td>
                    <td className="px-6 py-4 text-xs font-semibold">{tx.doctorShare}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          tx.status === "Disbursed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
