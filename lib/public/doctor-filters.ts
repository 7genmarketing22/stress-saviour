import { mapToDoctorCard } from "@/lib/patient/mappers";
import type { DoctorWithProfile } from "@/lib/patient/types";
import { findCatalogItem, MENTAL_CONDITIONS, MENTAL_SYMPTOMS } from "./catalog";

export const ALL_CITIES_LABEL = "All Cities";

export interface DoctorSearchFilters {
  q?: string;
  city?: string;
  specialty?: string;
  symptom?: string;
  condition?: string;
  maxFee?: number;
  minRating?: number;
  topReviewed?: boolean;
  availableNow?: boolean;
}

export function parseDoctorSearchParams(params: URLSearchParams): DoctorSearchFilters {
  const maxFee = params.get("maxFee");
  const minRating = params.get("minRating");

  return {
    q: params.get("q") ?? undefined,
    city: params.get("city") ?? undefined,
    specialty: params.get("specialty") ?? undefined,
    symptom: params.get("symptom") ?? undefined,
    condition: params.get("condition") ?? undefined,
    maxFee: maxFee ? Number(maxFee) : undefined,
    minRating: minRating ? Number(minRating) : undefined,
    topReviewed: params.get("topReviewed") === "true",
    availableNow: params.get("availableNow") === "true",
  };
}

export function buildDoctorSearchUrl(filters: DoctorSearchFilters): string {
  const params = new URLSearchParams();

  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.city && filters.city !== ALL_CITIES_LABEL) params.set("city", filters.city);
  if (filters.specialty && filters.specialty !== "All") params.set("specialty", filters.specialty);
  if (filters.symptom) params.set("symptom", filters.symptom);
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.maxFee) params.set("maxFee", String(filters.maxFee));
  if (filters.minRating) params.set("minRating", String(filters.minRating));
  if (filters.topReviewed) params.set("topReviewed", "true");
  if (filters.availableNow) params.set("availableNow", "true");

  const query = params.toString();
  return query ? `/doctors?${query}` : "/doctors";
}

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function doctorCities(doc: DoctorWithProfile): string[] {
  if (doc.cities?.length) return doc.cities;
  if (doc.profile?.city) return [doc.profile.city];
  return [];
}

function getDoctorSearchHaystack(doc: DoctorWithProfile): string {
  return normalizeSearchText(
    [
      doc.profile?.full_name ?? "",
      doc.specialization,
      doc.sub_specialization ?? "",
      ...(doc.qualification ?? []),
      doc.bio ?? "",
      ...doctorCities(doc),
      ...(doc.languages ?? []),
      ...(doc.hospital_affiliations ?? []),
    ].join(" ")
  );
}

function getQueryWords(q: string): string[] {
  return normalizeSearchText(q)
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

function matchesCatalogWord(doc: DoctorWithProfile, word: string): boolean {
  for (const item of [...MENTAL_SYMPTOMS, ...MENTAL_CONDITIONS]) {
    const terms = [item.label, ...item.keywords].map(normalizeSearchText);
    const termHit = terms.some(
      (term) => term.includes(word) || word.includes(term)
    );
    if (!termHit) continue;

    const specialtyMatch = item.specialty
      ? normalizeSearchText(doc.specialization).includes(
          normalizeSearchText(item.specialty)
        )
      : false;

    if (specialtyMatch || matchesKeywords(doc, item.keywords)) {
      return true;
    }
  }
  return false;
}

function matchesFreeTextQuery(doc: DoctorWithProfile, q: string): boolean {
  const words = getQueryWords(q);
  if (words.length === 0) return true;

  const haystack = getDoctorSearchHaystack(doc);
  return words.every(
    (word) => haystack.includes(word) || matchesCatalogWord(doc, word)
  );
}

function matchesKeywords(doc: DoctorWithProfile, keywords: string[]): boolean {
  const haystack = getDoctorSearchHaystack(doc);
  return keywords.some((kw) => haystack.includes(normalizeSearchText(kw)));
}

function matchesCity(doc: DoctorWithProfile, city: string): boolean {
  const cityNorm = normalizeSearchText(city);
  return doctorCities(doc).some((c) => normalizeSearchText(c) === cityNorm);
}

function matchesSpecialty(doc: DoctorWithProfile, specialty: string): boolean {
  const spec = normalizeSearchText(specialty);
  return (
    normalizeSearchText(doc.specialization).includes(spec) ||
    normalizeSearchText(doc.sub_specialization ?? "").includes(spec)
  );
}

export function filterDoctors(
  doctors: DoctorWithProfile[],
  filters: DoctorSearchFilters
): ReturnType<typeof mapToDoctorCard>[] {
  let result = [...doctors];

  if (filters.city && filters.city !== ALL_CITIES_LABEL) {
    result = result.filter((doc) => matchesCity(doc, filters.city!));
  }

  if (filters.specialty && filters.specialty !== "All") {
    result = result.filter((doc) => matchesSpecialty(doc, filters.specialty!));
  }

  if (filters.q?.trim()) {
    result = result.filter((doc) => matchesFreeTextQuery(doc, filters.q!));
  }

  if (filters.symptom) {
    const item = findCatalogItem("symptom", filters.symptom);
    if (item) {
      result = result.filter((doc) => {
        const keywordMatch = matchesKeywords(doc, item.keywords);
        const specialtyMatch = item.specialty
          ? doc.specialization.toLowerCase().includes(item.specialty.toLowerCase())
          : false;
        return keywordMatch || specialtyMatch;
      });
    }
  }

  if (filters.condition) {
    const item = findCatalogItem("condition", filters.condition);
    if (item) {
      result = result.filter((doc) => {
        const keywordMatch = matchesKeywords(doc, item.keywords);
        const specialtyMatch = item.specialty
          ? doc.specialization.toLowerCase().includes(item.specialty.toLowerCase())
          : false;
        return keywordMatch || specialtyMatch;
      });
    }
  }

  if (filters.maxFee) {
    result = result.filter((doc) => Number(doc.consultation_fee) <= filters.maxFee!);
  }

  if (filters.minRating) {
    result = result.filter((doc) => Number(doc.rating) >= filters.minRating!);
  }

  if (filters.topReviewed) {
    result = result.filter(
      (doc) => Number(doc.rating) >= 4 || (doc.total_reviews ?? 0) >= 5
    );
  }

  if (filters.availableNow) {
    result = result.filter((doc) => doc.is_available);
  }

  if (filters.topReviewed || filters.minRating) {
    result.sort(
      (a, b) =>
        Number(b.rating) - Number(a.rating) ||
        (b.total_reviews ?? 0) - (a.total_reviews ?? 0)
    );
  }

  return result.map(mapToDoctorCard);
}

export function getActiveFilterCount(filters: DoctorSearchFilters): number {
  let count = 0;
  if (filters.q?.trim()) count++;
  if (filters.city && filters.city !== ALL_CITIES_LABEL) count++;
  if (filters.specialty && filters.specialty !== "All") count++;
  if (filters.symptom) count++;
  if (filters.condition) count++;
  if (filters.maxFee) count++;
  if (filters.minRating) count++;
  if (filters.topReviewed) count++;
  if (filters.availableNow) count++;
  return count;
}

export function buildFilterTitle(filters: DoctorSearchFilters): string {
  const parts: string[] = [];

  if (filters.specialty && filters.specialty !== "All") {
    parts.push(`Best ${filters.specialty}s`);
  } else if (filters.symptom) {
    parts.push(`Doctors for ${findCatalogItem("symptom", filters.symptom)?.label ?? "Symptoms"}`);
  } else if (filters.condition) {
    parts.push(
      `Doctors for ${findCatalogItem("condition", filters.condition)?.label ?? "Conditions"}`
    );
  } else {
    parts.push("Best Mental Health Doctors");
  }

  if (filters.city && filters.city !== ALL_CITIES_LABEL) {
    parts.push(`In ${filters.city}`);
  }

  return parts.join(" ");
}
