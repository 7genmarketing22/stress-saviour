import type { RefundStatus } from "@/types";
import { REFUND_STATUS_LABEL } from "@/lib/refunds/policy";

export interface AppointmentFinancialInfo {
  consultationFee: number;
  refundStatus?: RefundStatus | null;
  refundAmount?: number | null;
  refundProcessedAt?: string | null;
  paymentStatus?: string | null;
  isCancelled?: boolean;
}

function formatPKR(value: number) {
  return `₨${Math.round(value).toLocaleString("en-PK")}`;
}

function formatRefundDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function refundStatusClass(status: RefundStatus) {
  const map: Record<RefundStatus, string> = {
    not_applicable: "text-slate-500",
    pending: "text-amber-600",
    processing: "text-blue-600",
    refunded: "text-emerald-600",
    failed: "text-red-600",
  };
  return map[status];
}

/** Whether doctor earnings should show as reversed (cancelled + refund active). */
function earningsReversed(info: AppointmentFinancialInfo): boolean {
  const rs = info.refundStatus;
  return (
    !!info.isCancelled &&
    !!rs &&
    rs !== "not_applicable" &&
    (rs === "pending" || rs === "processing" || rs === "refunded" || info.paymentStatus === "refunded")
  );
}

export function AppointmentFinancialDetails({ info }: { info: AppointmentFinancialInfo }) {
  const fee = Number(info.consultationFee);
  const commission = Math.round(fee * 0.1);
  const doctorEarning = Math.round(fee * 0.9);
  const reversed = earningsReversed(info);
  const refundStatus = info.refundStatus ?? "not_applicable";
  const refundDate = formatRefundDate(info.refundProcessedAt ?? null);

  return (
    <div>
      <h4 className="font-semibold text-sm mb-3">Financial Details</h4>
      <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
        <div className="flex items-center justify-between p-3">
          <p className="text-sm text-slate-600">Consultation Fee</p>
          <p className="font-semibold text-slate-900">{formatPKR(fee)}</p>
        </div>
        <div className="flex items-center justify-between p-3">
          <p className="text-sm text-slate-600">Platform Commission (10%)</p>
          <p className="font-semibold text-brand-500">{formatPKR(commission)}</p>
        </div>
        <div className="flex items-center justify-between p-3 bg-slate-50">
          <p className="text-sm font-semibold text-slate-900">
            Doctor Earnings
            {reversed && (
              <span className="ml-2 text-[10px] font-normal text-red-500 uppercase tracking-wide">Reversed</span>
            )}
          </p>
          <p className={`font-bold ${reversed ? "text-slate-400 line-through" : "text-slate-900"}`}>
            {reversed ? formatPKR(0) : formatPKR(doctorEarning)}
          </p>
        </div>

        {/* Refund status row */}
        <div className="flex items-center justify-between p-3">
          <p className="text-sm text-slate-600">Refund Status</p>
          <div className="text-right">
            <p className={`text-sm font-semibold ${refundStatusClass(refundStatus)}`}>
              {REFUND_STATUS_LABEL[refundStatus]}
              {refundStatus === "refunded" && info.refundAmount != null && (
                <span> — {formatPKR(Number(info.refundAmount))}</span>
              )}
              {refundStatus === "pending" && info.refundAmount != null && info.refundAmount > 0 && (
                <span> — {formatPKR(Number(info.refundAmount))}</span>
              )}
            </p>
            {refundStatus === "refunded" && refundDate && (
              <p className="text-[10px] text-muted-foreground mt-0.5">on {refundDate}</p>
            )}
            {refundStatus === "pending" && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting admin processing</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
