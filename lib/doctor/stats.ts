import type { RefundStatus } from "@/types";

/** Payment counts toward doctor earnings (excludes refunds in progress or completed). */
export function isDoctorNetEarning(payment: {
  status: string;
  refund_status?: RefundStatus | null;
}): boolean {
  if (payment.status !== "completed") return false;
  const rs = payment.refund_status ?? "not_applicable";
  return rs !== "pending" && rs !== "processing" && rs !== "refunded";
}
