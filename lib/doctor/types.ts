import type { AppointmentStatus, AppointmentType, DoctorProfile, Payment, Profile } from "@/types";

export interface DoctorCertificate {
  id: string;          // uuid
  name: string;        // original file name shown to user
  url: string;         // public Supabase storage URL
  uploaded_at: string; // ISO date string
}

export interface DoctorDocuments {
  certificates?: DoctorCertificate[];
  payout_settings?: {
    method: "bank" | "easypaisa" | "jazzcash";
    bankName: string;
    iban: string;
    walletNumber: string;
  };
  telehealth_settings?: {
    sessionDuration: number;
    enableVideo: boolean;
    enableAudio: boolean;
    enableChat: boolean;
    autoApprove: boolean;
  };
  schedule_config?: {
    bufferTime: number;
    bookingNotice: number;
    maxPatients: number;
  };
  blocked_dates?: Array<{ id: string; date: string; reason: string }>;
  practice_tasks?: Array<{ id: number; text: string; completed: boolean }>;
}

export interface DoctorContextData {
  profile: Profile;
  doctorProfile: DoctorProfile;
  documents: DoctorDocuments;
}

export interface AppointmentWithPatient {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
  scheduled_at: string;
  duration_minutes: number;
  patient_notes: string | null;
  doctor_notes: string | null;
  prescription_url: string | null;
  video_room_url: string | null;
  consultation_fee: number;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  patient: Pick<
    Profile,
    "id" | "full_name" | "email" | "phone" | "city" | "date_of_birth" | "gender" | "avatar_url"
  > | null;
}

export interface PaymentWithPatient extends Pick<
  Payment,
  | "id"
  | "appointment_id"
  | "patient_id"
  | "doctor_id"
  | "amount"
  | "platform_fee"
  | "doctor_earning"
  | "payment_method"
  | "status"
  | "payout_status"
  | "paid_at"
  | "payout_reference"
  | "transaction_id"
  | "refund_status"
  | "refund_amount"
  | "created_at"
> {
  patient: Pick<Profile, "id" | "full_name"> | null;
  appointment: { appointment_type: AppointmentType } | null;
}
