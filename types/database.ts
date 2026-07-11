export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "patient" | "doctor" | "admin" | "super_admin";
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          city: string | null;
          date_of_birth: string | null;
          gender: "male" | "female" | "other" | null;
          is_active: boolean;
          account_status: "pending" | "approved" | "rejected";
          rejection_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "patient" | "doctor" | "admin" | "super_admin";
          full_name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          date_of_birth?: string | null;
          gender?: "male" | "female" | "other" | null;
          is_active?: boolean;
          account_status?: "pending" | "approved" | "rejected";
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "patient" | "doctor" | "admin" | "super_admin";
          full_name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          date_of_birth?: string | null;
          gender?: "male" | "female" | "other" | null;
          is_active?: boolean;
          account_status?: "pending" | "approved" | "rejected";
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      doctor_profiles: {
        Row: {
          id: string;
          user_id: string;
          status: "pending" | "approved" | "rejected" | "suspended";
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
          documents: Json | null;
          rating: number;
          total_reviews: number;
          total_consultations: number;
          is_available: boolean;
          approved_by: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: "pending" | "approved" | "rejected" | "suspended";
          specialization: string;
          sub_specialization?: string | null;
          qualification: string[];
          experience_years: number;
          pmdc_number: string;
          bio?: string | null;
          consultation_fee: number;
          follow_up_fee?: number | null;
          languages?: string[];
          cities?: string[] | null;
          hospital_affiliations?: string[] | null;
          documents?: Json | null;
          rating?: number;
          total_reviews?: number;
          total_consultations?: number;
          is_available?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: "pending" | "approved" | "rejected" | "suspended";
          specialization?: string;
          sub_specialization?: string | null;
          qualification?: string[];
          experience_years?: number;
          pmdc_number?: string;
          bio?: string | null;
          consultation_fee?: number;
          follow_up_fee?: number | null;
          languages?: string[];
          cities?: string[] | null;
          hospital_affiliations?: string[] | null;
          documents?: Json | null;
          rating?: number;
          total_reviews?: number;
          total_consultations?: number;
          is_available?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          appointment_type: "video" | "chat" | "in_person";
          status: "scheduled" | "ongoing" | "completed" | "cancelled" | "no_show" | "pending_payment";
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
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          appointment_type: "video" | "chat" | "in_person";
          status?: "scheduled" | "ongoing" | "completed" | "cancelled" | "no_show" | "pending_payment";
          scheduled_at: string;
          duration_minutes?: number;
          patient_notes?: string | null;
          doctor_notes?: string | null;
          prescription_url?: string | null;
          video_room_url?: string | null;
          consultation_fee: number;
          cancellation_reason?: string | null;
          cancelled_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          appointment_type?: "video" | "chat" | "in_person";
          status?: "scheduled" | "ongoing" | "completed" | "cancelled" | "no_show" | "pending_payment";
          scheduled_at?: string;
          duration_minutes?: number;
          patient_notes?: string | null;
          doctor_notes?: string | null;
          prescription_url?: string | null;
          video_room_url?: string | null;
          consultation_fee?: number;
          cancellation_reason?: string | null;
          cancelled_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          appointment_id: string;
          patient_id: string;
          doctor_id: string;
          amount: number;
          platform_fee: number;
          doctor_earning: number;
          payment_method: "jazzcash" | "easypaisa" | "stripe" | "bank_transfer";
          status: "pending" | "completed" | "failed" | "refunded";
          payout_status: "pending" | "paid";
          paid_at: string | null;
          paid_by: string | null;
          payout_reference: string | null;
          payout_receipt_url: string | null;
          refund_status: "not_applicable" | "pending" | "processing" | "refunded" | "failed";
          refund_amount: number | null;
          refund_initiated_at: string | null;
          refund_processed_at: string | null;
          refund_processed_by: string | null;
          refund_note: string | null;
          transaction_id: string | null;
          gateway_response: Json | null;
          refund_id: string | null;
          refunded_at: string | null;
          proof_url: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          patient_id: string;
          doctor_id: string;
          amount: number;
          platform_fee?: number;
          doctor_earning: number;
          payment_method: "jazzcash" | "easypaisa" | "stripe" | "bank_transfer";
          status?: "pending" | "completed" | "failed" | "refunded";
          payout_status?: "pending" | "paid";
          paid_at?: string | null;
          paid_by?: string | null;
          payout_reference?: string | null;
          payout_receipt_url?: string | null;
          refund_status?: "not_applicable" | "pending" | "processing" | "refunded" | "failed";
          refund_amount?: number | null;
          refund_initiated_at?: string | null;
          refund_processed_at?: string | null;
          refund_processed_by?: string | null;
          refund_note?: string | null;
          transaction_id?: string | null;
          gateway_response?: Json | null;
          refund_id?: string | null;
          refunded_at?: string | null;
          proof_url?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          patient_id?: string;
          doctor_id?: string;
          amount?: number;
          platform_fee?: number;
          doctor_earning?: number;
          payment_method?: "jazzcash" | "easypaisa" | "stripe" | "bank_transfer";
          status?: "pending" | "completed" | "failed" | "refunded";
          payout_status?: "pending" | "paid";
          paid_at?: string | null;
          paid_by?: string | null;
          payout_reference?: string | null;
          payout_receipt_url?: string | null;
          refund_status?: "not_applicable" | "pending" | "processing" | "refunded" | "failed";
          refund_amount?: number | null;
          refund_initiated_at?: string | null;
          refund_processed_at?: string | null;
          refund_processed_by?: string | null;
          refund_note?: string | null;
          transaction_id?: string | null;
          gateway_response?: Json | null;
          refund_id?: string | null;
          refunded_at?: string | null;
          proof_url?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          appointment_id: string;
          patient_id: string;
          doctor_id: string;
          rating: number;
          comment: string | null;
          is_visible: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          patient_id: string;
          doctor_id: string;
          rating: number;
          comment?: string | null;
          is_visible?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          patient_id?: string;
          doctor_id?: string;
          rating?: number;
          comment?: string | null;
          is_visible?: boolean;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string | null;
          is_read: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string | null;
          is_read?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string | null;
          is_read?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      availability_slots: {
        Row: {
          id: string;
          doctor_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_duration_minutes: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          doctor_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_duration_minutes?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          doctor_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          slot_duration_minutes?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      admin_staff: {
        Row: {
          id: string;
          user_id: string;
          created_by: string | null;
          permissions: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_by?: string | null;
          permissions: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_by?: string | null;
          permissions?: Json;
          is_active?: boolean;
          created_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          appointment_id: string;
          sender_id: string;
          message: string | null;
          attachment_url: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          sender_id: string;
          message?: string | null;
          attachment_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          sender_id?: string;
          message?: string | null;
          attachment_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      platform_settings: {
        Row: {
          key: string;
          value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          participant_a: string;
          participant_b: string;
          created_at: string;
          updated_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          participant_a: string;
          participant_b: string;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          participant_a?: string;
          participant_b?: string;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string | null;
          attachment_url: string | null;
          attachment_type: "image" | "file" | null;
          attachment_name: string | null;
          attachment_size: number | null;
          reply_to_id: string | null;
          is_edited: boolean;
          edited_at: string | null;
          deleted_for_sender: boolean;
          deleted_for_everyone: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body?: string | null;
          attachment_url?: string | null;
          attachment_type?: "image" | "file" | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          reply_to_id?: string | null;
          is_edited?: boolean;
          edited_at?: string | null;
          deleted_for_sender?: boolean;
          deleted_for_everyone?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string | null;
          attachment_url?: string | null;
          attachment_type?: "image" | "file" | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          reply_to_id?: string | null;
          is_edited?: boolean;
          edited_at?: string | null;
          deleted_for_sender?: boolean;
          deleted_for_everyone?: boolean;
          created_at?: string;
        };
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
      };
      message_reads: {
        Row: {
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: {
          message_id?: string;
          user_id?: string;
          read_at?: string;
        };
      };
    };

    Views: Record<string, never>;
    Functions: {
      provision_staff_member: {
        Args: {
          p_email: string;
          p_password: string;
          p_full_name: string;
          p_phone: string;
          p_role: Database["public"]["Enums"]["user_role"];
          p_permissions: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: "patient" | "doctor" | "admin" | "super_admin";
      doctor_status: "pending" | "approved" | "rejected" | "suspended";
      appointment_status: "scheduled" | "ongoing" | "completed" | "cancelled" | "no_show" | "pending_payment";
      appointment_type: "video" | "chat" | "in_person";
      payment_status: "pending" | "completed" | "failed" | "refunded";
      payment_method: "jazzcash" | "easypaisa" | "stripe" | "bank_transfer";
      gender: "male" | "female" | "other";
    };
    CompositeTypes: Record<string, never>;
  };
};
