"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  DollarSign, Wallet, CheckCircle2, Clock, RefreshCw, Loader2, Search,
  Download, FileText, Filter, X, Check, Users, Undo2, BadgeCheck,
} from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import {
  getAdminPayments,
  markPaymentPaid,
  markPaymentPending,
  settleDoctorPayments,
  buildDoctorPayoutSummaries,
  buildPayoutTotals,
} from "@/lib/admin/api";
import { usePaymentsRealtime } from "@/lib/realtime/usePaymentsRealtime";
import type { AdminPayment } from "@/lib/admin/types";
import type { PaymentMethod, PaymentStatus, PayoutStatus } from "@/types";

function formatPKR(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-PK")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  stripe: "Card",
  bank_transfer: "Bank Transfer",
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending",
  completed: "Collected",
  failed: "Failed",
  refunded: "Refunded",
};

function paymentStatusClass(status: PaymentStatus) {
  const map: Record<PaymentStatus, string> = {
    completed: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-slate-100 text-slate-700",
  };
  return map[status];
}

function payoutBadgeClass(status: PayoutStatus) {
  return status === "paid"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-800";
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

export default function AdminPaymentsPage() {
  const { profile } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [toast, setToast] = useState("");

  const [view, setView] = useState<"doctors" | "transactions">("doctors");
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmSettle, setConfirmSettle] = useState<{ doctorId: string; name: string; amount: number } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [payoutFilter, setPayoutFilter] = useState<"all" | PayoutStatus>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setPayments(await getAdminPayments());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  usePaymentsRealtime({ onChange: loadData });

  const doctorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of payments) {
      if (p.doctor_id) map.set(p.doctor_id, p.doctor?.profile?.full_name ?? "Doctor");
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [payments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    return payments.filter((p) => {
      if (doctorFilter !== "all" && p.doctor_id !== doctorFilter) return false;
      if (payoutFilter !== "all" && p.payout_status !== payoutFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      const created = new Date(p.created_at).getTime();
      if (fromTs && created < fromTs) return false;
      if (toTs && created > toTs) return false;
      if (q) {
        const haystack = [
          p.transaction_id,
          p.patient?.full_name,
          p.doctor?.profile?.full_name,
          p.payout_reference,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [payments, search, doctorFilter, payoutFilter, statusFilter, dateFrom, dateTo]);

  const totals = useMemo(() => buildPayoutTotals(filtered), [filtered]);
  const doctorSummaries = useMemo(() => buildDoctorPayoutSummaries(filtered), [filtered]);

  const hasActiveFilters =
    search || doctorFilter !== "all" || payoutFilter !== "all" || statusFilter !== "all" || dateFrom || dateTo;

  const resetFilters = () => {
    setSearch("");
    setDoctorFilter("all");
    setPayoutFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const doctorUserId = (doctorId: string) =>
    payments.find((p) => p.doctor_id === doctorId)?.doctor?.user_id ?? undefined;

  const handleMarkPaid = async (p: AdminPayment) => {
    setActionId(p.id);
    try {
      await markPaymentPaid(p.id, profile.id, { notifyDoctorUserId: p.doctor?.user_id ?? undefined });
      await loadData();
      showToast(`Payout cleared for ${p.doctor?.profile?.full_name ?? "doctor"}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to clear payout.");
    } finally {
      setActionId(null);
    }
  };

  const handleMarkPending = async (p: AdminPayment) => {
    setActionId(p.id);
    try {
      await markPaymentPending(p.id);
      await loadData();
      showToast("Payout reverted to pending.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to revert payout.");
    } finally {
      setActionId(null);
    }
  };

  const handleSettleDoctor = async () => {
    if (!confirmSettle) return;
    const { doctorId, name } = confirmSettle;
    setActionId(doctorId);
    setConfirmSettle(null);
    try {
      const { total, updated } = await settleDoctorPayments(doctorId, profile.id, {
        notifyDoctorUserId: doctorUserId(doctorId),
      });
      await loadData();
      showToast(`Settled ${formatPKR(total)} across ${updated.length} payment(s) for ${name}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to settle payouts.");
    } finally {
      setActionId(null);
    }
  };

  const exportTransactions = () => {
    const rows = filtered.map((p) => ({
      "Txn ID": p.transaction_id ?? p.id.slice(0, 8),
      Date: formatDate(p.created_at),
      Patient: p.patient?.full_name ?? "Patient",
      Doctor: p.doctor?.profile?.full_name ?? "Doctor",
      Specialization: p.doctor?.specialization ?? "—",
      Method: METHOD_LABEL[p.payment_method as PaymentMethod] ?? p.payment_method,
      Amount: Number(p.amount),
      "Platform Fee": Number(p.platform_fee),
      "Doctor Earning": Number(p.doctor_earning),
      "Payment Status": PAYMENT_STATUS_LABEL[p.status as PaymentStatus] ?? p.status,
      "Payout Status": p.payout_status === "paid" ? "Paid" : "Pending",
      "Paid At": formatDate(p.paid_at),
      Reference: p.payout_reference ?? "",
    }));
    downloadCsv(`stress-saviors-transactions-${Date.now()}.csv`, rows);
    showToast(rows.length ? `Exported ${rows.length} transactions.` : "No transactions to export.");
  };

  const exportDoctorStatement = (doctorId: string, name: string) => {
    const rows = payments
      .filter((p) => p.doctor_id === doctorId && p.status === "completed")
      .map((p) => ({
        "Txn ID": p.transaction_id ?? p.id.slice(0, 8),
        Date: formatDate(p.created_at),
        Patient: p.patient?.full_name ?? "Patient",
        "Gross Fee": Number(p.amount),
        "Platform Fee (10%)": Number(p.platform_fee),
        "Net Earning": Number(p.doctor_earning),
        "Payout Status": p.payout_status === "paid" ? "Paid" : "Pending",
        "Paid At": formatDate(p.paid_at),
        Reference: p.payout_reference ?? "",
      }));
    downloadCsv(`statement-${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv`, rows);
    showToast(rows.length ? `Exported statement for ${name}.` : "No records for this doctor.");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Doctor Earnings",
      value: formatPKR(totals.totalEarned),
      sub: "Net of platform commission",
      icon: Wallet,
      accent: "text-sky-500",
    },
    {
      label: "Cleared / Paid Out",
      value: formatPKR(totals.totalPaid),
      sub: "Settled to doctors",
      icon: CheckCircle2,
      accent: "text-emerald-600",
    },
    {
      label: "Pending Settlement",
      value: formatPKR(totals.totalPending),
      sub: "Awaiting your approval",
      icon: Clock,
      accent: "text-amber-500",
    },
    {
      label: "Commission Revenue",
      value: formatPKR(totals.commission),
      sub: `${formatPKR(totals.grossVolume)} gross volume`,
      icon: DollarSign,
      accent: "text-teal-600",
    },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-right duration-200">
          <Check className="h-4 w-4 text-teal-400" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Doctor Payments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review earnings, settle doctor payouts, and audit every transaction. Updates sync live to doctor dashboards.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportTransactions}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                  {c.label}
                  <Icon className={`h-4 w-4 ${c.accent}`} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-2">{c.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search patient, doctor, txn or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all">All doctors</option>
              {doctorOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={payoutFilter}
              onChange={(e) => setPayoutFilter(e.target.value as "all" | PayoutStatus)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all">All payouts</option>
              <option value="pending">Pending settlement</option>
              <option value="paid">Paid / Cleared</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | PaymentStatus)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all">All payments</option>
              <option value="completed">Collected</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 px-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 px-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            Showing {filtered.length} of {payments.length} transactions
          </p>
        </CardContent>
      </Card>

      {/* View toggle */}
      <div className="flex bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setView("doctors")}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
            view === "doctors" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> By Doctor
        </button>
        <button
          onClick={() => setView("transactions")}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
            view === "transactions" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Transactions
        </button>
      </div>

      {/* By Doctor view */}
      {view === "doctors" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Doctor Settlement Summary</CardTitle>
            <CardDescription>Clear outstanding earnings per doctor</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4">Doctor</th>
                    <th className="px-6 py-4">Total Earned</th>
                    <th className="px-6 py-4">Paid</th>
                    <th className="px-6 py-4">Pending</th>
                    <th className="px-6 py-4">Last Paid</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {doctorSummaries.map((d) => (
                    <tr key={d.doctorId} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.specialization}</p>
                      </td>
                      <td className="px-6 py-4 font-semibold">{formatPKR(d.totalEarned)}</td>
                      <td className="px-6 py-4 text-emerald-600 font-medium">{formatPKR(d.totalPaid)}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-amber-600">{formatPKR(d.totalPending)}</span>
                        {d.pendingCount > 0 && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground">({d.pendingCount})</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{formatDate(d.lastPaidAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => exportDoctorStatement(d.doctorId, d.name)}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" /> Statement
                          </Button>
                          <Button
                            size="sm"
                            disabled={d.totalPending <= 0 || actionId === d.doctorId}
                            onClick={() => setConfirmSettle({ doctorId: d.doctorId, name: d.name, amount: d.totalPending })}
                            className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40"
                          >
                            {actionId === d.doctorId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                            )}
                            Settle All
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {doctorSummaries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                        No doctor earnings match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions view */}
      {view === "transactions" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Transaction Ledger</CardTitle>
            <CardDescription>Settle individual payments and audit the full record</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4">Txn</th>
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4">Doctor</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Dr Share</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Payout</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((tx) => {
                    const isCompleted = tx.status === "completed";
                    const isPaid = tx.payout_status === "paid";
                    return (
                      <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">{tx.transaction_id ?? tx.id.slice(0, 8)}</td>
                        <td className="px-6 py-4 font-medium">{tx.patient?.full_name ?? "Patient"}</td>
                        <td className="px-6 py-4">{tx.doctor?.profile?.full_name ?? "Doctor"}</td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">{formatDate(tx.created_at)}</td>
                        <td className="px-6 py-4 font-semibold">{formatPKR(Number(tx.amount))}</td>
                        <td className="px-6 py-4 text-xs font-semibold">{formatPKR(Number(tx.doctor_earning))}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${paymentStatusClass(tx.status as PaymentStatus)}`}>
                            {PAYMENT_STATUS_LABEL[tx.status as PaymentStatus] ?? tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${payoutBadgeClass(tx.payout_status)}`}>
                            {isPaid ? "Paid" : "Pending"}
                          </span>
                          {isPaid && tx.paid_at && (
                            <p className="text-[10px] text-muted-foreground mt-1">{formatDate(tx.paid_at)}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!isCompleted ? (
                            <span className="text-[10px] text-muted-foreground">Not collected</span>
                          ) : isPaid ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionId === tx.id}
                              onClick={() => handleMarkPending(tx)}
                              className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {actionId === tx.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5 mr-1" />}
                              Revert
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={actionId === tx.id}
                              onClick={() => handleMarkPaid(tx)}
                              className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                            >
                              {actionId === tx.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                              Mark Paid
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-sm text-muted-foreground">
                        No transactions match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settle confirmation modal */}
      {confirmSettle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-sm w-full shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Settle Doctor Payout</h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setConfirmSettle(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-teal-500/5 border border-teal-500/10 p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground">Clearing all pending earnings for</p>
                <p className="text-base font-bold mt-1">{confirmSettle.name}</p>
                <p className="text-3xl font-black text-teal-600 mt-2">{formatPKR(confirmSettle.amount)}</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                This marks every collected-but-unpaid payment as paid. The doctor&apos;s dashboard updates instantly.
              </p>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmSettle(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSettleDoctor} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                  Confirm &amp; Settle
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
