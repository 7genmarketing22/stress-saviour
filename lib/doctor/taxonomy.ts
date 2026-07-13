import type { CatalogItem } from "@/lib/public/catalog";

export type TaxonomyKind = "symptom" | "condition";

export interface TaxonomyTag {
  id: string;
  label: string;
  kind: TaxonomyKind;
}

export const DOCTOR_TAXONOMY_SELECT = `
  doctor_taxonomy (
    taxonomy_items ( id, label, kind )
  )
`;

type RawTaxonomyRow = {
  taxonomy_items: { id: string; label: string; kind: string } | null;
};

export function flattenDoctorTaxonomy(
  rows: RawTaxonomyRow[] | null | undefined,
): TaxonomyTag[] {
  return (rows ?? [])
    .map((row) => row.taxonomy_items)
    .filter((item): item is { id: string; label: string; kind: string } => Boolean(item))
    .map((item) => ({
      id: item.id,
      label: item.label,
      kind: item.kind as TaxonomyKind,
    }));
}

export function attachTaxonomyToDoctor<T extends Record<string, unknown>>(
  doctor: T & { doctor_taxonomy?: RawTaxonomyRow[] | null },
): T & { taxonomy_tags: TaxonomyTag[] } {
  const { doctor_taxonomy, ...rest } = doctor;
  return {
    ...rest,
    taxonomy_tags: flattenDoctorTaxonomy(doctor_taxonomy),
  } as T & { taxonomy_tags: TaxonomyTag[] };
}

export function doctorHasTaxonomyTag(
  doctor: { taxonomy_tags?: TaxonomyTag[] },
  tagId: string,
): boolean {
  return (doctor.taxonomy_tags ?? []).some((tag) => tag.id === tagId);
}

export function matchesDoctorTaxonomyTag(
  doctor: {
    taxonomy_tags?: TaxonomyTag[];
    specialization: string;
    sub_specialization?: string | null;
    qualification?: string[];
    bio?: string | null;
    cities?: string[] | null;
    languages?: string[] | null;
    hospital_affiliations?: string[] | null;
    profile?: { full_name?: string | null; city?: string | null } | null;
  },
  tagId: string,
  item?: { keywords: string[]; specialty?: string },
): boolean {
  if (doctorHasTaxonomyTag(doctor, tagId)) {
    return true;
  }

  if ((doctor.taxonomy_tags ?? []).length > 0) {
    return false;
  }

  if (!item) return false;

  const haystack = [
    doctor.profile?.full_name ?? "",
    doctor.specialization,
    doctor.sub_specialization ?? "",
    ...(doctor.qualification ?? []),
    doctor.bio ?? "",
    ...(doctor.cities ?? []),
    doctor.profile?.city ?? "",
    ...(doctor.languages ?? []),
    ...(doctor.hospital_affiliations ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const keywordMatch = item.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
  const specialtyMatch = item.specialty
    ? doctor.specialization.toLowerCase().includes(item.specialty.toLowerCase())
    : false;
  return keywordMatch || specialtyMatch;
}

export function getTaxonomyLabels(
  doctor: { taxonomy_tags?: TaxonomyTag[] },
  limit = 4,
): string[] {
  return (doctor.taxonomy_tags ?? []).slice(0, limit).map((tag) => tag.label);
}

export function groupTaxonomyByKind(tags: TaxonomyTag[]) {
  return {
    symptoms: tags.filter((tag) => tag.kind === "symptom"),
    conditions: tags.filter((tag) => tag.kind === "condition"),
  };
}

export function validateTaxonomySelection(
  tagIds: string[],
  catalogItems: CatalogItem[],
): string | null {
  if (tagIds.length === 0) {
    return "Select at least one symptom or condition you treat.";
  }
  const validIds = new Set(catalogItems.map((item) => item.id));
  const invalid = tagIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    return "One or more selected categories are invalid.";
  }
  return null;
}
