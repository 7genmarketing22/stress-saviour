export interface AssessmentResponse {
  question: string;
  score: number;
  answerText: string;
}

export interface PatientAssessment {
  id: string;
  patient_id: string;
  test_type: "anxiety" | "anger";
  responses: AssessmentResponse[];
  total_score: number;
  severity: "healthy" | "mild" | "moderate" | "severe";
  created_at: string;
  patient_name?: string;
  patient_email?: string;
  patient_avatar?: string;
}

export interface AssessmentShare {
  id: string;
  assessment_id: string;
  doctor_id: string;
  status: "new" | "reviewed";
  doctor_notes: string | null;
  reviewed_at: string | null;
  shared_at: string;
  assessment?: PatientAssessment;
  doctor_name?: string;
  doctor_avatar?: string;
}
