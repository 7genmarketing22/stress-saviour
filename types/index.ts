export type { Database } from "./database";

export type UserRole = "patient" | "doctor" | "admin" | "super_admin";
export type DoctorStatus = "pending" | "approved" | "rejected" | "suspended";
export type AppointmentStatus = "scheduled" | "ongoing" | "completed" | "cancelled" | "no_show";
export type AppointmentType = "video" | "chat" | "in_person";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentMethod = "jazzcash" | "easypaisa" | "stripe" | "bank_transfer";
export type Gender = "male" | "female" | "other";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  status: DoctorStatus;
  specialization: string;
  sub_specialization: string | null;
  qualification: string[];
  experience_years: number;
  pmdc_number: string;
  bio: string | null;
  consultation_fee: number;
  follow_up_fee: number | null;
  languages: string[];
  cities: string[] | null;
  hospital_affiliations: string[] | null;
  documents: Record<string, string> | null;
  rating: number;
  total_reviews: number;
  total_consultations: number;
  is_available: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
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
}

export interface Payment {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  amount: number;
  platform_fee: number;
  doctor_earning: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  transaction_id: string | null;
  gateway_response: Record<string, unknown> | null;
  refund_id: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPermissions {
  can_approve_doctors: boolean;
  can_reject_doctors: boolean;
  can_view_payments: boolean;
  can_refund_payments: boolean;
  can_manage_patients: boolean;
  can_view_reports: boolean;
  can_send_notifications: boolean;
  can_manage_staff: boolean;
}

// Pakistan Cities
export const PAKISTAN_CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Hyderabad",
  "Abbottabad",
  "Bahawalpur",
] as const;

export type PakistanCity = (typeof PAKISTAN_CITIES)[number];

// Medical Specializations
export const SPECIALIZATIONS = [
  "Psychiatrist",
  "Psychologist",
  "General Physician",
  "Dermatologist",
  "Cardiologist",
  "Neurologist",
  "Gynecologist",
  "Pediatrician",
  "Orthopedic Surgeon",
  "ENT Specialist",
  "Dentist",
  "Nutritionist",
] as const;

export type Specialization = (typeof SPECIALIZATIONS)[number];
