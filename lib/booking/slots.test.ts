import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterPastSlotsForToday,
  generateTimeSlotsForDate,
  getPkTodayDate,
  getSessionDurationForDate,
  isSlotInPast,
} from "./slots.ts";

const mondaySlots = [
  {
    day_of_week: 1,
    start_time: "09:00:00",
    end_time: "17:00:00",
    slot_duration_minutes: 30,
  },
];

describe("generateTimeSlotsForDate", () => {
  it("generates slots strictly within working hours", () => {
    const slots = generateTimeSlotsForDate(mondaySlots, "2026-07-13", 30);
    assert.deepEqual(slots[0], "09:00");
    assert.deepEqual(slots[slots.length - 1], "16:30");
    assert.ok(!slots.includes("17:00"));
  });

  it("excludes slots that would extend past closing time", () => {
    const slots = generateTimeSlotsForDate(
      [
        {
          day_of_week: 1,
          start_time: "16:00:00",
          end_time: "17:00:00",
          slot_duration_minutes: 30,
        },
      ],
      "2026-07-13",
      45,
    );
    assert.deepEqual(slots, ["16:00"]);
    assert.ok(!slots.includes("16:30"));
  });

  it("allows the last 30-minute session to start at closing minus duration", () => {
    const slots = generateTimeSlotsForDate(
      [
        {
          day_of_week: 1,
          start_time: "09:00:00",
          end_time: "17:00:00",
          slot_duration_minutes: 30,
        },
      ],
      "2026-07-13",
      30,
    );
    assert.ok(slots.includes("16:30"));
    assert.ok(!slots.includes("17:00"));
  });

  it("returns no slots when the day is outside the doctor schedule", () => {
    const slots = generateTimeSlotsForDate(mondaySlots, "2026-07-12", 30);
    assert.deepEqual(slots, []);
  });
});

describe("filterPastSlotsForToday", () => {
  // 2026-07-13T18:02+05:00 → 18:02 in Pakistan.
  const pkEvening = new Date("2026-07-13T13:02:00Z");
  const times = ["09:00", "17:30", "18:00", "18:30", "19:00"];

  it("drops slots at or before the current PK time when the date is today", () => {
    assert.deepEqual(
      filterPastSlotsForToday(times, "2026-07-13", pkEvening),
      ["18:30", "19:00"],
    );
  });

  it("keeps all slots for future dates", () => {
    assert.deepEqual(
      filterPastSlotsForToday(times, "2026-07-14", pkEvening),
      times,
    );
  });

  it("uses the PK calendar date, not UTC", () => {
    // 2026-07-13T20:30Z is already 2026-07-14 01:30 in Pakistan.
    const pkPastMidnight = new Date("2026-07-13T20:30:00Z");
    assert.equal(getPkTodayDate(pkPastMidnight), "2026-07-14");
    assert.deepEqual(
      filterPastSlotsForToday(["01:00", "02:00"], "2026-07-14", pkPastMidnight),
      ["02:00"],
    );
  });
});

describe("isSlotInPast", () => {
  const pkEvening = new Date("2026-07-13T13:02:00Z"); // 18:02 PK

  it("treats earlier dates as past", () => {
    assert.equal(isSlotInPast("2026-07-12", "23:30", pkEvening), true);
  });

  it("treats already-started slots today as past", () => {
    assert.equal(isSlotInPast("2026-07-13", "18:00", pkEvening), true);
  });

  it("treats upcoming slots today as bookable", () => {
    assert.equal(isSlotInPast("2026-07-13", "18:30", pkEvening), false);
  });

  it("treats future dates as bookable", () => {
    assert.equal(isSlotInPast("2026-07-14", "09:00", pkEvening), false);
  });
});

describe("getSessionDurationForDate", () => {
  it("uses the doctor configured slot duration for the selected day", () => {
    assert.equal(getSessionDurationForDate(mondaySlots, "2026-07-13"), 30);
  });

  it("falls back when no availability exists for the day", () => {
    assert.equal(getSessionDurationForDate(mondaySlots, "2026-07-12", 30), 30);
  });
});
