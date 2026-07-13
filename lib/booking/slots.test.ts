import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateTimeSlotsForDate,
  getSessionDurationForDate,
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

describe("getSessionDurationForDate", () => {
  it("uses the doctor configured slot duration for the selected day", () => {
    assert.equal(getSessionDurationForDate(mondaySlots, "2026-07-13"), 30);
  });

  it("falls back when no availability exists for the day", () => {
    assert.equal(getSessionDurationForDate(mondaySlots, "2026-07-12", 30), 30);
  });
});
