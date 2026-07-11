import type { Appointment, DoctorProfile, Payment, Profile } from "@/types";

export interface DoctorWithProfile extends DoctorProfile {
  profile: Pick<Profile, "full_name" | "avatar_url" | "city" | "phone"> | null;
}

export interface AppointmentWithDoctor extends Appointment {
  doctor: DoctorWithProfile | null;
  review?: { rating: number; comment: string | null } | { rating: number; comment: string | null }[] | null;
  payment?: Pick<
    Payment,
    | "id"
    | "status"
    | "proof_url"
    | "payment_method"
    | "rejection_reason"
    | "amount"
    | "refund_status"
    | "refund_amount"
    | "refund_initiated_at"
    | "refund_processed_at"
    | "refund_note"
    | "refunded_at"
  > | null;
  payments?: Pick<
    Payment,
    | "id"
    | "status"
    | "proof_url"
    | "payment_method"
    | "rejection_reason"
    | "amount"
    | "refund_status"
    | "refund_amount"
    | "refund_initiated_at"
    | "refund_processed_at"
    | "refund_note"
    | "refunded_at"
  >[] | null;
}

export interface PaymentWithDoctor extends Payment {
  doctor: Pick<DoctorWithProfile, "id" | "specialization"> & {
    profile: Pick<Profile, "full_name"> | null;
  } | null;
  appointment: Pick<Appointment, "appointment_type"> | null;
}

export interface PatientContextData {
  profile: Profile;
}

export interface PatientPrescription {
  id: string;
  appointmentId: string;
  doctorName: string;
  specialization: string;
  date: string;
  clinicalNote: string;
  prescription: { medication: string; dosage: string } | null;
  prescriptionUrl: string | null;
}
