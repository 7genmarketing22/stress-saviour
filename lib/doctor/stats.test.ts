import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDoctorNetEarning } from "./stats.ts";

describe("isDoctorNetEarning", () => {
  it("includes completed payments without refund", () => {
    assert.equal(
      isDoctorNetEarning({ status: "completed", refund_status: "not_applicable" }),
      true
    );
  });

  it("excludes pending and completed refunds", () => {
    assert.equal(
      isDoctorNetEarning({ status: "completed", refund_status: "pending" }),
      false
    );
    assert.equal(
      isDoctorNetEarning({ status: "completed", refund_status: "refunded" }),
      false
    );
  });
});
