import type { AppointmentStatus, AppointmentType, DoctorProfile, Profile } from "@/types";

export interface DoctorDocuments {
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

export interface PaymentWithPatient {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  amount: number;
  platform_fee: number;
  doctor_earning: number;
  payment_method: string;
  status: string;
  transaction_id: string | null;
  created_at: string;
  patient: Pick<Profile, "id" | "full_name"> | null;
  appointment: { appointment_type: AppointmentType } | null;
}
