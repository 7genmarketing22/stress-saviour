"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ShieldCheck,
  Download,
  Loader2,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  CheckCircle2,
  Clock,
  Receipt,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Plus,
  ArrowUpDown,
  Eye,
} from "lucide-react";
import { getPatientPayments } from "@/lib/patient/api";
import { formatCurrency, mapToPaymentRow, type PatientPaymentRow } from "@/lib/patient/mappers";
import { usePatient } from "@/contexts/PatientContext";
import { usePaymentsRealtime } from "@/lib/realtime/usePaymentsRealtime";
import type { PaymentMethod, PaymentStatus } from "@/types";

type StatusFilter = "all" | PaymentStatus;
type SortField = "date" | "amount";
type SortDir = "asc" | "desc";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
  { key: "refunded", label: "Refunded" },
];

const METHOD_OPTIONS: { key: "all" | PaymentMethod; label: string }[] = [
  { key: "all", label: "All Methods" },
  { key: "jazzcash", label: "JazzCash" },
  { key: "easypaisa", label: "EasyPaisa" },
  { key: "stripe", label: "Card" },
  { key: "bank_transfer", label: "Bank Transfer" },
];

function statusBadgeClass(status: PaymentStatus) {
  const map: Record<PaymentStatus, string> = {
    completed: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-slate-100 text-slate-700",
  };
  return map[status];
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadReceipt(tx: PatientPaymentRow, patientName: string) {
  const lines = [
    ["Field", "Value"],
    ["Receipt ID", tx.id],
    ["Patient", patientName],
    ["Consultant", tx.doctorName],
    ["Specialization", tx.specialization || "—"],
    ["Consultation Type", tx.appointmentType],
    ["Date", tx.date],
    ["Payment Method", tx.method],
    ["Amount (PKR)", String(tx.amountRaw)],
    ["Status", tx.status],
    ["Platform", "Stress Saviors Telehealth"],
  ];
  const csv = lines
    .map((row) => row.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `receipt-${tx.id}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printReceipt(tx: PatientPaymentRow, patientName: string) {
  const html = `<!DOCTYPE html>
<html><head><title>Receipt ${tx.id}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 24px; color: #111; }
  h1 { font-size: 1.25rem; margin: 0 0 4px; }
  .muted { color: #666; font-size: 0.875rem; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 0; border-bottom: 1px solid #eee; font-size: 0.9rem; }
  td:first-child { color: #666; width: 40%; }
  .total { font-weight: 700; font-size: 1.1rem; }
  .footer { margin-top: 32px; font-size: 0.75rem; color: #888; text-align: center; }
</style></head><body>
  <h1>Payment Receipt</h1>
  <p class="muted">Stress Saviors · ${tx.id}</p>
  <table>
    <tr><td>Patient</td><td>${patientName}</td></tr>
    <tr><td>Consultant</td><td>${tx.doctorName}</td></tr>
    <tr><td>Specialization</td><td>${tx.specialization || "—"}</td></tr>
    <tr><td>Consultation</td><td>${tx.appointmentType}</td></tr>
    <tr><td>Date</td><td>${tx.date}</td></tr>
    <tr><td>Payment Method</td><td>${tx.method}</td></tr>
    <tr><td>Status</td><td>${tx.status}</td></tr>
    <tr><td class="total">Amount</td><td class="total">${tx.amount}</td></tr>
  </table>
  <p class="footer">Secured with 128-bit SSL encryption · stresssaviors.pk</p>
  <script>window.onload = () => window.print();</script>
</body></html>`;
  const win = window.open("", "_blank", "width=720,height=800");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

const ITEMS_PER_PAGE = 8;

export default function PatientPaymentsPage() {
  const { profile } = usePatient();
  const [transactions, setTransactions] = useState<PatientPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [methodFilter, setMethodFilter] = useState<"all" | PaymentMethod>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<PatientPaymentRow | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientPayments();
      setTransactions(data.map(mapToPaymentRow));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  usePaymentsRealtime({ onChange: loadPayments });

  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.rawStatus === "completed");
    const pending = transactions.filter((t) => t.rawStatus === "pending");
    return {
      totalSpent: completed.reduce((sum, t) => sum + t.amountRaw, 0),
      completedCount: completed.length,
      pendingAmount: pending.reduce((sum, t) => sum + t.amountRaw, 0),
      pendingCount: pending.length,
      totalCount: transactions.length,
    };
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    return transactions.filter((tx) => {
      if (statusFilter !== "all" && tx.rawStatus !== statusFilter) return false;
      if (methodFilter !== "all" && tx.rawMethod !== methodFilter) return false;
      const created = new Date(tx.createdAt).getTime();
      if (fromTs && created < fromTs) return false;
      if (toTs && created > toTs) return false;
      if (q) {
        const haystack = [tx.id, tx.doctorName, tx.specialization, tx.method, tx.status]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, searchQuery, statusFilter, methodFilter, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const cmp =
        sortField === "amount"
          ? a.amountRaw - b.amountRaw
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const currentItems = sorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleExportAll = () => {
    if (sorted.length === 0) return;
    downloadCsv(
      `stress-saviors-payments-${Date.now()}.csv`,
      sorted.map((tx) => ({
        "Transaction ID": tx.id,
        Consultant: tx.doctorName,
        Specialization: tx.specialization,
        Date: tx.date,
        Method: tx.method,
        Amount: tx.amountRaw,
        Status: tx.status,
      }))
    );
    showToast(`Exported ${sorted.length} transaction(s).`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setMethodFilter("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== "all" || methodFilter !== "all" || dateFrom || dateTo;

  if (loading && transactions.length === 0) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-foreground text-background px-4 py-2.5 text-sm shadow-lg animate-in fade-in">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Billing & Payments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track your consultation payments, invoices, and platform transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadPayments} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            disabled={sorted.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
          <Link href="/patient/doctors">
            <Button className="bg-brand-500 hover:bg-brand-600 text-white" size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Book Appointment
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/10 bg-brand-500/5 text-xs text-muted-foreground">
        <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
        <span>
          All transactions are secured with 128-bit SSL encryption. We support JazzCash, EasyPaisa, and card payments.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Spent</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalSpent)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stats.completedCount} completed</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transactions</p>
                <p className="text-2xl font-bold mt-1">{stats.totalCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">All time</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-brand-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.pendingAmount)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stats.pendingCount} awaiting</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Success Rate</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.totalCount > 0
                    ? `${Math.round((stats.completedCount / stats.totalCount) * 100)}%`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Completed payments</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-cyan-50 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-brand-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transaction ID, doctor, or method..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={methodFilter}
              onChange={(e) => { setMethodFilter(e.target.value as "all" | PaymentMethod); setCurrentPage(1); }}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {METHOD_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              title="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              title="To date"
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                  statusFilter === tab.key
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              {sorted.length} transaction{sorted.length !== 1 ? "s" : ""} found
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Transaction ID</th>
                    <th className="px-6 py-3 font-semibold">Consultant</th>
                    <th className="px-6 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort("date")}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Date
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-6 py-3 font-semibold">Method</th>
                    <th className="px-6 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort("amount")}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Amount
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentItems.length > 0 ? (
                    currentItems.map((tx) => (
                      <tr key={tx.paymentId} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">{tx.id}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium">{tx.doctorName}</p>
                          {tx.specialization && (
                            <p className="text-xs text-muted-foreground">{tx.specialization}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">{tx.date}</td>
                        <td className="px-6 py-4 text-xs">{tx.method}</td>
                        <td className="px-6 py-4 font-semibold">{tx.amount}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(tx.rawStatus)}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => setSelectedTx(tx)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            {tx.rawStatus === "completed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-primary gap-1"
                                onClick={() => {
                                  downloadReceipt(tx, profile.full_name);
                                  showToast(`Receipt ${tx.id} downloaded.`);
                                }}
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Receipt</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="font-medium text-muted-foreground">
                          {hasActiveFilters
                            ? "No transactions match your filters."
                            : "No payment transactions found."}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Payments appear after booking consultations.
                        </p>
                        {!hasActiveFilters && (
                          <Link href="/patient/doctors">
                            <Button className="mt-4 bg-brand-500 hover:bg-brand-600 text-white" size="sm">
                              Browse Doctors
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Transaction Details</h3>
                <p className="text-xs font-mono text-muted-foreground">{selectedTx.id}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedTx(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Consultant</p>
                  <p className="font-medium">{selectedTx.doctorName}</p>
                  {selectedTx.specialization && (
                    <p className="text-xs text-muted-foreground">{selectedTx.specialization}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Consultation Type</p>
                  <p className="font-medium">{selectedTx.appointmentType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  <p className="font-medium">{selectedTx.date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                  <p className="font-medium">{selectedTx.method}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amount</p>
                  <p className="font-semibold text-lg">{selectedTx.amount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(selectedTx.rawStatus)}`}>
                    {selectedTx.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                {selectedTx.rawStatus === "completed" && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        downloadReceipt(selectedTx, profile.full_name);
                        showToast(`Receipt ${selectedTx.id} downloaded.`);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
                      onClick={() => printReceipt(selectedTx, profile.full_name)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Print / PDF
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  className={selectedTx.rawStatus === "completed" ? "" : "flex-1"}
                  onClick={() => setSelectedTx(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
