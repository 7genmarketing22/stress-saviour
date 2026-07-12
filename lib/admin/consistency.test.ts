import test from "node:test";
import assert from "node:assert/strict";
import { checkDashboardConsistency } from "./consistency.ts";

const baseInput = {
  doctors: [{ id: "d1", name: "Dr A", consultations: 2, earnings: 5000 }],
  totalPatients: 5,
  newPatientsInPeriod: 2,
  activePatients: 4,
  activeAppointments: 8,
  upcomingAppointments: 8,
  completedAppointments: 0,
};

test("returns no warnings when all stats reconcile", () => {
  assert.deepEqual(checkDashboardConsistency(baseInput), []);
});

test("flags a doctor with earnings but zero sessions", () => {
  const warnings = checkDashboardConsistency({
    ...baseInput,
    doctors: [{ id: "d1", name: "Dr Areeb", consultations: 0, earnings: 5400 }],
  });
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "EARNINGS_WITHOUT_SESSIONS");
});

test("flags a doctor with sessions but zero earnings", () => {
  const warnings = checkDashboardConsistency({
    ...baseInput,
    doctors: [{ id: "d1", name: "Dr B", consultations: 3, earnings: 0 }],
  });
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "SESSIONS_WITHOUT_EARNINGS");
});

test("flags when new patients in period exceeds total registered", () => {
  const warnings = checkDashboardConsistency({
    ...baseInput,
    totalPatients: 2,
    newPatientsInPeriod: 5,
  });
  assert.ok(warnings.some((w) => w.code === "PATIENTS_PERIOD_EXCEEDS_TOTAL"));
});

test("flags when active patients exceeds total registered", () => {
  const warnings = checkDashboardConsistency({
    ...baseInput,
    totalPatients: 3,
    activePatients: 5,
  });
  assert.ok(warnings.some((w) => w.code === "ACTIVE_PATIENTS_EXCEEDS_TOTAL"));
});

test("flags when appointment breakdown exceeds active total", () => {
  const warnings = checkDashboardConsistency({
    ...baseInput,
    activeAppointments: 5,
    upcomingAppointments: 4,
    completedAppointments: 3,
  });
  assert.ok(warnings.some((w) => w.code === "APPOINTMENT_BREAKDOWN_EXCEEDS_TOTAL"));
});
