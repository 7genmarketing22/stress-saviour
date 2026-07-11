"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  DollarSign, Wallet, CheckCircle2, Clock, RefreshCw, Loader2, Search,
  Download, FileText, Filter, X, Check, Users, Undo2, BadgeCheck, ImageIcon,
  Paperclip, ExternalLink, UploadCloud, Receipt,
} from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import {
  getAdminPayments,
  markPaymentPaid,
  markPaymentPending,
  settleDoctorPayments,
  buildDoctorPayoutSummaries,
  buildPayoutTotals,
  approvePatientPayment,
  rejectPatientPayment,
} from "@/lib/admin/api";
import { usePaymentsRealtime } from "@/lib/realtime/usePaymentsRealtime";
import { validatePayoutReceiptFile, uploadPayoutReceipt } from "@/lib/storage/payoutReceipt";
import { completeManualRefund } from "@/lib/refunds/process";
import { REFUND_STATUS_LABEL } from "@/lib/refunds/policy";
import type { AdminPayment } from "@/lib/admin/types";
import type { PaymentMethod, PaymentStatus, PayoutStatus, RefundStatus } from "@/types";

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
  const [settleReceiptFile, setSettleReceiptFile] = useState<File | null>(null);
  const [settleReceiptError, setSettleReceiptError] = useState<string | null>(null);
  const [settleUploading, setSettleUploading] = useState(false);
  const [reviewPayment, setReviewPayment] = useState<AdminPayment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewProofPayment, setViewProofPayment] = useState<AdminPayment | null>(null);
  const [viewPayoutReceiptUrl, setViewPayoutReceiptUrl] = useState<{ url: string; doctorName: string; reference: string } | null>(null);

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

  const pendingApprovals = useMemo(
    () => payments.filter((p) => p.status === "pending" && p.proof_url),
    [payments]
  );

  const pendingRefunds = useMemo(
    () => payments.filter((p) => p.refund_status === "pending" || p.refund_status === "processing"),
    [payments]
  );

  const handleProcessRefund = async (paymentId: string) => {
    setActionId(paymentId);
    try {
      await completeManualRefund(paymentId, profile.id);
      showToast("Refund marked as processed. Patient has been notified.");
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Refund processing failed");
    } finally {
      setActionId(null);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    setActionId(paymentId);
    try {
      await approvePatientPayment(paymentId, profile.id);
      showToast("Payment approved. Booking confirmed.");
      setReviewPayment(null);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActionId(null);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    setActionId(paymentId);
    try {
      await rejectPatientPayment(paymentId, profile.id, rejectReason);
      showToast("Payment proof rejected. Patient can re-upload.");
      setReviewPayment(null);
      setRejectReason("");
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setActionId(null);
    }
  };

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

  const handleReceiptFileChange = (file: File | null) => {
    if (!file) {
      setSettleReceiptFile(null);
      setSettleReceiptError(null);
      return;
    }
    const err = validatePayoutReceiptFile(file);
    setSettleReceiptError(err);
    setSettleReceiptFile(file);
  };

  const closeSettleModal = () => {
    setConfirmSettle(null);
    setSettleReceiptFile(null);
    setSettleReceiptError(null);
  };

  const handleSettleDoctor = async () => {
    if (!confirmSettle || !settleReceiptFile) return;
    const { doctorId, name } = confirmSettle;

    setSettleUploading(true);
    let receiptUrl: string | undefined;
    try {
      // Generate a temporary reference to name the file; final reference comes from the API
      const tempRef = `PRE-${Date.now().toString(36).toUpperCase()}`;
      receiptUrl = await uploadPayoutReceipt(profile.id, tempRef, settleReceiptFile);
    } catch (err) {
      setSettleReceiptError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setSettleUploading(false);
      return;
    }
    setSettleUploading(false);

    setActionId(doctorId);
    closeSettleModal();
    try {
      const { total, updated } = await settleDoctorPayments(doctorId, profile.id, {
        notifyDoctorUserId: doctorUserId(doctorId),
        receiptUrl,
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
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
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
      accent: "text-brand-500",
    },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-right duration-200">
          <Check className="h-4 w-4 text-brand-300" />
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

      {pendingApprovals.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-violet-900">
              <ImageIcon className="h-5 w-5" />
              Pending Payment Approvals ({pendingApprovals.length})
            </CardTitle>
            <CardDescription>
              Review patient payment screenshots and approve to confirm bookings.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-violet-100/50 border-b border-violet-200 text-violet-900">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Patient</th>
                    <th className="px-6 py-3 font-semibold">Doctor</th>
                    <th className="px-6 py-3 font-semibold">Amount</th>
                    <th className="px-6 py-3 font-semibold">Method</th>
                    <th className="px-6 py-3 font-semibold">Submitted</th>
                    <th className="px-6 py-3 font-semibold">Proof</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-100">
                  {pendingApprovals.map((p) => (
                    <tr key={p.id} className="hover:bg-violet-50/50">
                      <td className="px-6 py-4 font-medium">{p.patient?.full_name ?? "Patient"}</td>
                      <td className="px-6 py-4">{p.doctor?.profile?.full_name ?? "Doctor"}</td>
                      <td className="px-6 py-4 font-semibold">{formatPKR(Number(p.amount))}</td>
                      <td className="px-6 py-4">{METHOD_LABEL[p.payment_method]}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{formatDate(p.created_at)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setViewProofPayment(p)}
                          title="View payment attachment"
                          className="inline-flex items-center gap-1.5 text-xs text-violet-700 hover:text-violet-900 font-medium hover:underline"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setReviewPayment(p)}>
                            Review Proof
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={actionId === p.id}
                            onClick={() => handleApprovePayment(p.id)}
                          >
                            {actionId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingRefunds.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Undo2 className="h-5 w-5" />
              Pending Refunds ({pendingRefunds.length})
            </CardTitle>
            <CardDescription>
              Cancelled appointments awaiting manual refund to the patient&apos;s payment method.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-amber-100/50 border-b border-amber-200 text-amber-900">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Patient</th>
                    <th className="px-6 py-3 font-semibold">Doctor</th>
                    <th className="px-6 py-3 font-semibold">Refund Amount</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Initiated</th>
                    <th className="px-6 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {pendingRefunds.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-50/50">
                      <td className="px-6 py-4 font-medium">{p.patient?.full_name ?? "Patient"}</td>
                      <td className="px-6 py-4">{p.doctor?.profile?.full_name ?? "Doctor"}</td>
                      <td className="px-6 py-4 font-semibold text-amber-700">
                        {formatPKR(Number(p.refund_amount ?? p.amount))}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-amber-700">
                          {REFUND_STATUS_LABEL[p.refund_status as RefundStatus]}
                        </span>
                        {p.refund_note && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xs truncate" title={p.refund_note}>
                            {p.refund_note}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {formatDate(p.refund_initiated_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                          disabled={actionId === p.id}
                          onClick={() => handleProcessRefund(p.id)}
                        >
                          {actionId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          )}
                          Mark Refunded
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
              />
            </div>
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
            >
              <option value="all">All doctors</option>
              {doctorOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={payoutFilter}
              onChange={(e) => setPayoutFilter(e.target.value as "all" | PayoutStatus)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
            >
              <option value="all">All payouts</option>
              <option value="pending">Pending settlement</option>
              <option value="paid">Paid / Cleared</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | PaymentStatus)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
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
                className="h-9 px-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 px-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
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
                            className="h-8 text-xs bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40"
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
                    <th className="px-6 py-4">Refund</th>
                    <th className="px-6 py-4">Payout</th>
                    <th className="px-6 py-4">Proof</th>
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
                          <span className="text-[10px] font-semibold text-slate-600">
                            {REFUND_STATUS_LABEL[(tx.refund_status ?? "not_applicable") as RefundStatus]}
                          </span>
                          {(tx.refund_status === "pending" || tx.refund_status === "refunded") && tx.refund_amount != null && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatPKR(Number(tx.refund_amount))}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${payoutBadgeClass(tx.payout_status)}`}>
                            {isPaid ? "Paid" : "Pending"}
                          </span>
                          {isPaid && tx.paid_at && (
                            <p className="text-[10px] text-muted-foreground mt-1">{formatDate(tx.paid_at)}</p>
                          )}
                          {isPaid && (tx as any).payout_receipt_url && (
                            <button
                              onClick={() => setViewPayoutReceiptUrl({
                                url: (tx as any).payout_receipt_url,
                                doctorName: tx.doctor?.profile?.full_name ?? "Doctor",
                                reference: tx.payout_reference ?? "—",
                              })}
                              className="mt-1 inline-flex items-center gap-1 text-[10px] text-brand-600 hover:text-brand-800 font-medium hover:underline"
                            >
                              <Receipt className="h-3 w-3" /> Receipt
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {tx.proof_url ? (
                            <button
                              onClick={() => setViewProofPayment(tx)}
                              title="View payment attachment"
                              className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 font-medium hover:underline"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              View
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {tx.refund_status === "pending" || tx.refund_status === "processing" ? (
                            <Button
                              size="sm"
                              disabled={actionId === tx.id}
                              onClick={() => handleProcessRefund(tx.id)}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {actionId === tx.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                              Refund
                            </Button>
                          ) : !isCompleted ? (
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
                              className="h-8 text-xs bg-brand-500 hover:bg-brand-600 text-white"
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
                      <td colSpan={11} className="px-6 py-12 text-center text-sm text-muted-foreground">
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
          <div className="bg-card rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Settle Doctor Payout</h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={closeSettleModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-5">
              {/* Amount summary */}
              <div className="bg-brand-400/5 border border-brand-400/10 p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground">Clearing all pending earnings for</p>
                <p className="text-base font-bold mt-1">{confirmSettle.name}</p>
                <p className="text-3xl font-black text-brand-500 mt-2">{formatPKR(confirmSettle.amount)}</p>
              </div>

              {/* Receipt upload — mandatory */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Attach Payout Receipt <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Upload your bank transfer screenshot or receipt. Required before confirming settlement.
                </p>

                {!settleReceiptFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-400/5 transition-colors group">
                    <UploadCloud className="h-7 w-7 text-slate-300 group-hover:text-brand-400 mb-1.5 transition-colors" />
                    <span className="text-sm font-medium text-slate-500 group-hover:text-brand-600">Click to upload</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG, PDF — max 10 MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => handleReceiptFileChange(e.target.files?.[0] ?? null)}
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                    <Receipt className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{settleReceiptFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(settleReceiptFile.size / 1024).toFixed(0)} KB — ready to upload
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReceiptFileChange(null)}
                      title="Remove and choose another file"
                      className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {settleReceiptError && (
                  <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                    <X className="h-3 w-3" /> {settleReceiptError}
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                This marks every collected-but-unpaid payment as paid. The doctor&apos;s dashboard updates instantly.
              </p>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={closeSettleModal} disabled={settleUploading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSettleDoctor}
                  disabled={!settleReceiptFile || !!settleReceiptError || settleUploading}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold disabled:opacity-50"
                >
                  {settleUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading…</>
                  ) : (
                    "Confirm & Settle"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <h3 className="text-lg font-bold">Review Payment Proof</h3>
                <p className="text-xs text-muted-foreground">
                  {reviewPayment.patient?.full_name} → {reviewPayment.doctor?.profile?.full_name}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setReviewPayment(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-bold">{formatPKR(Number(reviewPayment.amount))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="font-medium">{METHOD_LABEL[reviewPayment.payment_method]}</p>
                </div>
              </div>
              {reviewPayment.proof_url && (
                <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={reviewPayment.proof_url}
                    alt="Payment proof"
                    className="w-full max-h-80 object-contain"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Rejection reason (optional)
                </label>
                <textarea
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason if rejecting the proof..."
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  disabled={actionId === reviewPayment.id}
                  onClick={() => handleRejectPayment(reviewPayment.id)}
                >
                  Reject
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={actionId === reviewPayment.id}
                  onClick={() => handleApprovePayment(reviewPayment.id)}
                >
                  {actionId === reviewPayment.id ? "Processing..." : "Approve & Confirm Booking"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment viewer modal — available for all payments (pending & approved) */}
      {viewProofPayment && (
        <AttachmentViewerModal
          payment={viewProofPayment}
          onClose={() => setViewProofPayment(null)}
        />
      )}

      {/* Payout receipt viewer */}
      {viewPayoutReceiptUrl && (
        <PayoutReceiptViewerModal
          url={viewPayoutReceiptUrl.url}
          doctorName={viewPayoutReceiptUrl.doctorName}
          reference={viewPayoutReceiptUrl.reference}
          onClose={() => setViewPayoutReceiptUrl(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Attachment Viewer Modal
   Handles image (inline preview) and PDF (iframe) with a download fallback.
   Shows a "No attachment" state when proof_url is absent.
───────────────────────────────────────────────────────────────────────────── */
function AttachmentViewerModal({
  payment,
  onClose,
}: {
  payment: AdminPayment;
  onClose: () => void;
}) {
  const url = payment.proof_url ?? null;

  // Strip query string before checking extension
  const rawPath = url ? url.split("?")[0] : "";
  const isPdf = rawPath.toLowerCase().endsWith(".pdf");

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-card rounded-2xl max-w-2xl w-full shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-brand-500" />
              Payment Attachment
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {payment.patient?.full_name ?? "Patient"} &rarr;{" "}
              {payment.doctor?.profile?.full_name ?? "Doctor"} &mdash;{" "}
              {formatPKR(Number(payment.amount))} via {METHOD_LABEL[payment.payment_method as PaymentMethod] ?? payment.payment_method}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Payment meta strip */}
        <div className="px-5 py-3 border-b bg-muted/30 flex flex-wrap gap-x-6 gap-y-1.5 text-xs shrink-0">
          <span>
            <span className="text-muted-foreground">Status: </span>
            <span className="font-semibold capitalize">{payment.status}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Submitted: </span>
            <span className="font-medium">{formatDate(payment.created_at)}</span>
          </span>
          {payment.reviewed_at && (
            <span>
              <span className="text-muted-foreground">Reviewed: </span>
              <span className="font-medium">{formatDate(payment.reviewed_at)}</span>
            </span>
          )}
          {payment.transaction_id && (
            <span className="font-mono">
              <span className="text-muted-foreground">Txn: </span>
              {payment.transaction_id}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 min-h-0">
          {!url ? (
            /* No attachment state */
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Paperclip className="h-10 w-10 opacity-25" />
              <p className="text-sm font-medium">No attachment uploaded</p>
              <p className="text-xs">This payment was submitted without a proof screenshot.</p>
            </div>
          ) : isPdf ? (
            /* PDF preview via iframe */
            <div className="rounded-lg border border-border overflow-hidden bg-muted/10 h-[55vh]">
              <iframe
                src={url}
                title="Payment proof PDF"
                className="w-full h-full"
              />
            </div>
          ) : (
            /* Image preview */
            <div className="rounded-lg border border-border overflow-hidden bg-muted/20 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Payment proof"
                className="max-w-full max-h-[55vh] object-contain"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t flex items-center justify-between gap-3 shrink-0">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800 hover:underline"
            >
              <Download className="h-4 w-4" />
              Download attachment
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Payout Receipt Viewer Modal
   Shows the admin-uploaded payout receipt for a settled transaction.
───────────────────────────────────────────────────────────────────────────── */
function PayoutReceiptViewerModal({
  url,
  doctorName,
  reference,
  onClose,
}: {
  url: string;
  doctorName: string;
  reference: string;
  onClose: () => void;
}) {
  const rawPath = url.split("?")[0];
  const isPdf = rawPath.toLowerCase().endsWith(".pdf");

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-2xl max-w-2xl w-full shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-brand-500" />
              Payout Receipt
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Settlement for <span className="font-medium">{doctorName}</span>
              {reference !== "—" && <> &mdash; Ref: <span className="font-mono">{reference}</span></>}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 min-h-0">
          {isPdf ? (
            <div className="rounded-lg border border-border overflow-hidden bg-muted/10 h-[55vh]">
              <iframe src={url} title="Payout receipt PDF" className="w-full h-full" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden bg-muted/20 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Payout receipt" className="max-w-full max-h-[55vh] object-contain" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex items-center justify-between gap-3 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800 hover:underline"
          >
            <Download className="h-4 w-4" />
            Download receipt
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </a>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
