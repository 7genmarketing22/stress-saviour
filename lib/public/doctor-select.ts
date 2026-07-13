import type { DoctorWithProfile } from "@/lib/patient/types";
import {
  attachTaxonomyToDoctor,
  DOCTOR_TAXONOMY_SELECT,
} from "@/lib/doctor/taxonomy";

export const BASE_DOCTOR_SELECT = `
  id, user_id, status, specialization, sub_specialization, qualification, experience_years,
  pmdc_number, bio, consultation_fee, follow_up_fee, rating, total_reviews,
  is_available, cities, languages, hospital_affiliations,
  profile:profiles!doctor_profiles_user_id_fkey ( full_name, avatar_url, city, phone )
`;

export const DOCTOR_SELECT_WITH_TAXONOMY = `
  ${BASE_DOCTOR_SELECT},
  ${DOCTOR_TAXONOMY_SELECT}
`;

export function mapDoctorRows(rows: Record<string, unknown>[]): DoctorWithProfile[] {
  return rows.map((row) => attachTaxonomyToDoctor(row)) as unknown as DoctorWithProfile[];
}

export function mapDoctorRowsWithoutTaxonomy(
  rows: Record<string, unknown>[],
): DoctorWithProfile[] {
  return rows.map((row) => ({
    ...(row as unknown as DoctorWithProfile),
    taxonomy_tags: [],
  }));
}

type DoctorQueryResult = {
  data: Record<string, unknown>[] | Record<string, unknown> | null;
  error: { message?: string } | null;
};

/** Prefer taxonomy join; fall back to base select when the join fails (e.g. migration not applied). */
export async function resolveDoctorRows(
  withTaxonomy: DoctorQueryResult,
  withoutTaxonomy: () => Promise<DoctorQueryResult>,
): Promise<DoctorWithProfile[]> {
  if (!withTaxonomy.error) {
    const rows = (withTaxonomy.data ?? []) as Record<string, unknown>[];
    return mapDoctorRows(Array.isArray(rows) ? rows : [rows]);
  }

  const fallback = await withoutTaxonomy();
  if (!fallback.error) {
    const rows = (fallback.data ?? []) as Record<string, unknown>[];
    return mapDoctorRowsWithoutTaxonomy(Array.isArray(rows) ? rows : [rows]);
  }

  throw withTaxonomy.error ?? fallback.error;
}

export async function resolveDoctorRow(
  withTaxonomy: DoctorQueryResult,
  withoutTaxonomy: () => Promise<DoctorQueryResult>,
): Promise<DoctorWithProfile | null> {
  const rows = await resolveDoctorRows(
    {
      data: withTaxonomy.data ? [withTaxonomy.data as Record<string, unknown>] : null,
      error: withTaxonomy.error,
    },
    async () => {
      const result = await withoutTaxonomy();
      return {
        error: result.error,
        data: result.data ? [result.data as Record<string, unknown>] : null,
      };
    },
  );
  return rows[0] ?? null;
}
