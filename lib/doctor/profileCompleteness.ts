import type { DoctorProfile, Profile } from "@/types";
import type { DoctorDocuments } from "./types";

export interface ProfileCompletenessResult {
  score: number;       // 0–10
  maxScore: number;    // always 10
  percent: number;     // 0–100
  isComplete: boolean; // true when score >= 7
  missing: string[];   // human-readable list of what's missing
}

/**
 * Scores a doctor's profile completeness out of 10.
 * A score >= 7 is considered "professional/complete" and suppresses the popup.
 */
export function checkProfileCompleteness(
  profile: Profile,
  doctorProfile: DoctorProfile,
  documents: DoctorDocuments
): ProfileCompletenessResult {
  const missing: string[] = [];
  let score = 0;

  // Photo (2 pts — highest impact for patient trust)
  if (profile.avatar_url) {
    score += 2;
  } else {
    missing.push("Profile photo");
  }

  // Bio with substance (2 pts)
  if (doctorProfile.bio && doctorProfile.bio.trim().length >= 60) {
    score += 2;
  } else {
    missing.push("Professional bio (at least 60 characters)");
  }

  // Phone number (1 pt)
  if (profile.phone?.trim()) {
    score += 1;
  } else {
    missing.push("Phone number");
  }

  // City (1 pt)
  if (profile.city?.trim()) {
    score += 1;
  } else {
    missing.push("City");
  }

  // Real PMDC number (not a PENDING placeholder) (1 pt)
  if (doctorProfile.pmdc_number && !doctorProfile.pmdc_number.startsWith("PENDING-")) {
    score += 1;
  } else {
    missing.push("Valid PMDC number");
  }

  // Real qualifications (not placeholder) (1 pt)
  const hasRealQual = doctorProfile.qualification?.some(
    (q) => q && q.toLowerCase() !== "pending verification" && q.trim().length > 2
  );
  if (hasRealQual) {
    score += 1;
  } else {
    missing.push("Qualification(s)");
  }

  // Certificate uploaded (1 pt)
  if (documents.certificates && documents.certificates.length > 0) {
    score += 1;
  } else {
    missing.push("At least one certificate");
  }

  const percent = Math.round((score / 10) * 100);
  return {
    score,
    maxScore: 10,
    percent,
    isComplete: score >= 7,
    missing,
  };
}
