import { createClient } from "@/lib/supabase/client";
import type { PatientAssessment, AssessmentShare, AssessmentResponse } from "@/types/assessment";
import { createNotification } from "@/lib/notifications/api";

const db = () => {
  return createClient() as any;
};

export async function saveAssessment(params: {
  testType: "anxiety" | "anger";
  responses: AssessmentResponse[];
  totalScore: number;
  severity: "healthy" | "mild" | "moderate" | "severe";
}): Promise<PatientAssessment> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await db()
    .from("patient_assessments")
    .insert({
      patient_id: user.id,
      test_type: params.testType,
      responses: params.responses,
      total_score: params.totalScore,
      severity: params.severity,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PatientAssessment;
}

export async function getPatientAssessments(): Promise<PatientAssessment[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Step 1: fetch the patient's own assessments
  const { data: assessments, error: aptErr } = await db()
    .from("patient_assessments")
    .select("*")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false });

  if (aptErr) throw aptErr;
  if (!assessments?.length) return [];

  // Step 2: fetch shares + doctor profile for those assessments
  const ids = assessments.map((a: { id: string }) => a.id);
  const { data: shares, error: shareErr } = await db()
    .from("assessment_shares")
    .select(`
      *,
      doctor:profiles!assessment_shares_doctor_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .in("assessment_id", ids)
    .order("shared_at", { ascending: false });

  if (shareErr) throw shareErr;

  // Step 3: group shares by assessment id
  const sharesByAssessment = new Map<string, unknown[]>();
  for (const share of shares ?? []) {
    const list = sharesByAssessment.get(share.assessment_id) ?? [];
    list.push(share);
    sharesByAssessment.set(share.assessment_id, list);
  }

  return assessments.map((a: PatientAssessment) => ({
    ...a,
    shares: sharesByAssessment.get(a.id) ?? [],
  })) as any[];
}

export async function getAssessmentDetails(id: string): Promise<PatientAssessment & { shares: any[] }> {
  const { data, error } = await db()
    .from("patient_assessments")
    .select(`
      *,
      shares:assessment_shares (
        *,
        doctor:profiles!assessment_shares_doctor_id_fkey (
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function shareAssessmentWithDoctors(assessmentId: string, doctorProfileIds: string[]): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // Fetch patient profile name for notifications
  const { data: patientProfile } = await db()
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const patientName = patientProfile?.full_name ?? "A patient";

  // assessment_shares.doctor_id references profiles(id) which equals doctor_profiles.user_id
  const { data: doctorProfiles, error: lookupErr } = await db()
    .from("doctor_profiles")
    .select("id, user_id")
    .in("id", doctorProfileIds);

  if (lookupErr) throw lookupErr;

  const userIdByProfileId = new Map<string, string>(
    (doctorProfiles ?? []).map((dp: any) => [dp.id, dp.user_id])
  );

  const insertData = doctorProfileIds
    .filter((id) => userIdByProfileId.has(id))
    .map((docProfileId) => ({
      assessment_id: assessmentId,
      doctor_id: userIdByProfileId.get(docProfileId)!,
      status: "new",
    }));

  if (insertData.length === 0) throw new Error("Could not resolve doctor user IDs.");

  const { error } = await db()
    .from("assessment_shares")
    .insert(insertData);

  if (error) throw error;

  // Send notifications to each doctor
  for (const docProfileId of doctorProfileIds) {
    try {
      const doctorUserId = userIdByProfileId.get(docProfileId);
      if (doctorUserId) {
        await createNotification(
          doctorUserId,
          "New Shared Health Assessment",
          `${patientName} has shared a behavioral self-screening report with you for review.`,
          "assessment",
          { assessment_id: assessmentId }
        );
      }
    } catch (e) {
      console.warn("Failed to notify doctor for assessment share", e);
    }
  }
}

export async function getDoctorSharedReports(doctorProfileId: string): Promise<AssessmentShare[]> {
  // assessment_shares.doctor_id references profiles(id) = doctor_profiles.user_id
  const { data: dp, error: dpErr } = await db()
    .from("doctor_profiles")
    .select("user_id")
    .eq("id", doctorProfileId)
    .single();

  if (dpErr || !dp?.user_id) return [];

  const { data, error } = await db()
    .from("assessment_shares")
    .select(`
      *,
      assessment:patient_assessments (
        *,
        patient:profiles ( id, full_name, avatar_url, email )
      )
    `)
    .eq("doctor_id", dp.user_id)
    .order("shared_at", { ascending: false });

  if (error) throw error;

  // Flatten patient name/avatar for convenience if needed
  return (data ?? []).map((share: any) => ({
    ...share,
    patient_name: share.assessment?.patient?.full_name ?? "Patient",
    patient_email: share.assessment?.patient?.email ?? "",
    patient_avatar: share.assessment?.patient?.avatar_url ?? null,
  })) as AssessmentShare[];
}

export async function submitDoctorReview(shareId: string, notes: string): Promise<void> {
  const { data: shareData, error: fetchErr } = await db()
    .from("assessment_shares")
    .select("*, assessment:patient_assessments(*)")
    .eq("id", shareId)
    .single();

  if (fetchErr) throw fetchErr;

  const { error } = await db()
    .from("assessment_shares")
    .update({
      doctor_notes: notes.trim(),
      status: "reviewed",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (error) throw error;

  // Notify the patient that their report has been reviewed
  try {
    const patientId = shareData.assessment?.patient_id;
    if (patientId) {
      // Get doctor's name
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      let docName = "Your doctor";
      if (user) {
        const { data: docProfile } = await db()
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (docProfile) docName = docProfile.full_name;
      }

      await createNotification(
        patientId,
        "Assessment Reviewed",
        `${docName} has added recommendations to your behavioral screening report.`,
        "assessment",
        { share_id: shareId }
      );
    }
  } catch (e) {
    console.warn("Failed to notify patient of reviewed assessment", e);
  }
}
