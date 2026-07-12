import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPatientDashboardStats,
  isPatientNetPayment,
} from "./stats.ts";

test("isPatientNetPayment excludes refunded and pending refunds", () => {
  assert.equal(
    isPatientNetPayment({ status: "completed", refund_status: "not_applicable" }),
    true
  );
  assert.equal(
    isPatientNetPayment({ status: "completed", refund_status: "pending" }),
    false
  );
  assert.equal(isPatientNetPayment({ status: "refunded" }), false);
});

test("net spent only sums non-refunded completed payments", () => {
  const stats = buildPatientDashboardStats(
    [
      {
        id: "p1",
        amount: 3000,
        status: "completed",
        refund_status: "not_applicable",
      },
      {
        id: "p2",
        amount: 2500,
        status: "completed",
        refund_status: "pending",
        refund_amount: 2500,
      },
      {
        id: "p3",
        amount: 20000,
        status: "completed",
        refund_status: "pending",
        refund_amount: 20000,
      },
    ] as never[],
    [
      { status: "completed" },
      { status: "cancelled" },
      { status: "cancelled" },
    ] as never[]
  );

  assert.equal(stats.netSpent, 3000);
  assert.equal(stats.paidSessionCount, 1);
  assert.equal(stats.avgPerSession, 3000);
  assert.equal(stats.pendingRefundCount, 2);
  assert.equal(stats.pendingRefundAmount, 22500);
  assert.equal(stats.completedAppointments, 1);
});
