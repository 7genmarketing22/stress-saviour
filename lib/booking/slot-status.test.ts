import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findFirstAvailableSlot,
  getSlotUiStatus,
  isSlotFreeingStatus,
  isSlotOccupyingStatus,
  isSlotSelectable,
  mapBookingErrorMessage,
  shouldRefreshSlotsAfterBookingError,
} from "./slot-status.ts";

describe("slot status helpers", () => {
  it("marks booked and blocked slots as non-selectable", () => {
    assert.equal(getSlotUiStatus("10:00", ["10:00"], []), "booked");
    assert.equal(getSlotUiStatus("10:00", [], ["10:00"]), "blocked");
    assert.equal(isSlotSelectable("10:00", ["10:00"], []), false);
    assert.equal(isSlotSelectable("11:00", ["10:00"], []), true);
  });

  it("finds the first available slot in order", () => {
    assert.equal(
      findFirstAvailableSlot(["09:00", "09:30", "10:00"], ["09:00"], ["09:30"]),
      "10:00",
    );
  });

  it("treats completed appointments as slot-occupying", () => {
    assert.equal(isSlotOccupyingStatus("completed"), true);
    assert.equal(isSlotFreeingStatus("completed"), false);
  });

  it("frees slots after cancellation or expiry", () => {
    assert.equal(isSlotFreeingStatus("cancelled"), true);
    assert.equal(isSlotFreeingStatus("expired_no_show"), true);
    assert.equal(isSlotOccupyingStatus("cancelled"), false);
  });
});

describe("mapBookingErrorMessage", () => {
  it("maps duplicate booking errors for concurrent attempts", () => {
    const err = Object.assign(new Error("duplicate key value"), { code: "23505" });
    assert.equal(
      mapBookingErrorMessage(err),
      "This slot was just booked by another patient. Please choose a different time.",
    );
  });

  it("maps working-hours violations", () => {
    const err = new Error("SLOT_OUTSIDE_HOURS: outside hours");
    assert.match(mapBookingErrorMessage(err), /working hours/i);
    assert.equal(shouldRefreshSlotsAfterBookingError(mapBookingErrorMessage(err)), true);
  });

  it("maps blocked-slot trigger errors", () => {
    const err = new Error("SLOT_BLOCKED: unavailable");
    assert.match(mapBookingErrorMessage(err), /unavailable/i);
  });
});
