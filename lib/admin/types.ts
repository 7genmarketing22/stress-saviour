import type {
  Appointment,
  AppointmentType,
  DoctorProfile,
  DoctorStatus,
  Payment,
  Profile,
} from "@/types";

export interface AdminAppointmentPayment {
  id: string;
  status: Payment["status"];
  amount: number;
  refund_status: Payment["refund_status"];
  refund_amount: number | null;
  refund_initiated_at: string | null;
  refund_processed_at: string | null;
  refund_note: string | null;
  refund_id: string | null;
  refunded_at: string | null;
}

export interface AdminContextData {
  profile: Profile;
}

export interface AdminDoctor extends DoctorProfile {
  profile: Pick<
    Profile,
    "id" | "full_name" | "email" | "phone" | "city" | "avatar_url" | "is_active" | "created_at"
  > | null;
}

export interface AdminAppointment extends Appointment {
  patient: Pick<Profile, "id" | "full_name" | "email" | "phone" | "city" | "avatar_url"> | null;
  doctor:
    | (Pick<DoctorProfile, "id" | "specialization"> & {
        profile: Pick<Profile, "full_name" | "avatar_url"> | null;
      })
    | null;
  payments?: AdminAppointmentPayment[] | null;
}

export interface AdminPayment extends Payment {
  patient: Pick<Profile, "id" | "full_name"> | null;
  doctor:
    | (Pick<DoctorProfile, "id" | "user_id" | "specialization"> & {
        profile: Pick<Profile, "full_name"> | null;
      })
    | null;
  appointment: { appointment_type: AppointmentType } | null;
}

export interface AdminPatientSummary {
  profile: Profile;
  totalAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  totalSpent: number;
  lastActivity: string | null;
  preferredDoctor: string | null;
}

export interface AdminStats {
  monthlyPlatformRevenue: number;
  grossVolume: number;
  pendingPayouts: number;
  totalDoctorEarnings: number;
  totalPaidOut: number;
  activeDoctors: number;
  pendingDoctors: number;
  pendingPatients: number;
  totalPatients: number;
  appointmentsToday: number;
  appointmentsTodayCompleted: number;
  appointmentsTodayUpcoming: number;
  newPatientsThisMonth: number;
  newDoctorsThisMonth: number;
  avgRating: number;
  totalReviews: number;
}

export interface AdminDashboardData {
  stats: AdminStats;
  doctors: AdminDoctor[];
  patients: AdminPatientSummary[];
  appointments: AdminAppointment[];
  payments: AdminPayment[];
}

export type { DoctorStatus };
