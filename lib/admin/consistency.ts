// Data-consistency checks for the admin dashboard.
//
// These pure functions flag when related stats drift out of sync (e.g. a doctor
// showing earnings with zero sessions). They exist so this class of bug is
// caught early — both in automated tests and via a live warning banner on the
// dashboard. All imports are type-only so this module has no runtime deps and
// can be unit-tested with the built-in `node --test` runner.

export interface DoctorStatRow {
  id: string;
  name: string;
  /** Paid, non-refunded sessions (source of earnings). */
  consultations: number;
  earnings: number;
}

export interface DashboardConsistencyInput {
  doctors: DoctorStatRow[];
  totalPatients: number;
  newPatientsInPeriod: number;
  activePatients: number;
  activeAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
}

export interface ConsistencyWarning {
  code:
    | "EARNINGS_WITHOUT_SESSIONS"
    | "SESSIONS_WITHOUT_EARNINGS"
    | "PATIENTS_PERIOD_EXCEEDS_TOTAL"
    | "ACTIVE_PATIENTS_EXCEEDS_TOTAL"
    | "APPOINTMENT_BREAKDOWN_EXCEEDS_TOTAL";
  message: string;
}

/**
 * Returns a list of consistency warnings. An empty array means every related
 * stat reconciles. Used by tests and surfaced on the dashboard in a banner.
 */
export function checkDashboardConsistency(
  input: DashboardConsistencyInput
): ConsistencyWarning[] {
  const warnings: ConsistencyWarning[] = [];

  for (const d of input.doctors) {
    if (d.earnings > 0 && d.consultations <= 0) {
      warnings.push({
        code: "EARNINGS_WITHOUT_SESSIONS",
        message: `${d.name} shows earnings (${d.earnings}) but 0 sessions — earnings and sessions must derive from the same paid records.`,
      });
    }
    if (d.consultations > 0 && d.earnings <= 0) {
      warnings.push({
        code: "SESSIONS_WITHOUT_EARNINGS",
        message: `${d.name} shows ${d.consultations} paid session(s) but 0 earnings.`,
      });
    }
  }

  if (input.newPatientsInPeriod > input.totalPatients) {
    warnings.push({
      code: "PATIENTS_PERIOD_EXCEEDS_TOTAL",
      message: `New patients in period (${input.newPatientsInPeriod}) exceeds total registered (${input.totalPatients}).`,
    });
  }

  if (input.activePatients > input.totalPatients) {
    warnings.push({
      code: "ACTIVE_PATIENTS_EXCEEDS_TOTAL",
      message: `Active patients (${input.activePatients}) exceeds total registered (${input.totalPatients}).`,
    });
  }

  if (
    input.upcomingAppointments + input.completedAppointments >
    input.activeAppointments
  ) {
    warnings.push({
      code: "APPOINTMENT_BREAKDOWN_EXCEEDS_TOTAL",
      message: `Upcoming (${input.upcomingAppointments}) + completed (${input.completedAppointments}) exceeds active appointments (${input.activeAppointments}).`,
    });
  }

  return warnings;
}
