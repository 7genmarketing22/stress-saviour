import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getPkDayOfWeek, pkDateTimeToUtcIso } from "./timezone.ts";

describe("timezone helpers", () => {
  it("converts clinic-local date/time to UTC ISO", () => {
    assert.equal(
      pkDateTimeToUtcIso("2026-07-14", "10:00"),
      "2026-07-14T05:00:00.000Z",
    );
  });

  it("resolves day-of-week in Asia/Karachi", () => {
    // 2026-07-13 is a Monday in Pakistan.
    assert.equal(getPkDayOfWeek("2026-07-13"), 1);
  });
});
