import { createClient } from "@/lib/supabase/client";
import type { TaxonomyTag } from "@/lib/doctor/taxonomy";

function table(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient().from(name) as any;
}

export async function getDoctorTaxonomyIds(doctorProfileId: string): Promise<string[]> {
  const { data, error } = await table("doctor_taxonomy")
    .select("taxonomy_id")
    .eq("doctor_id", doctorProfileId);

  if (error) throw error;
  return (data ?? []).map((row: { taxonomy_id: string }) => row.taxonomy_id);
}

export async function setDoctorTaxonomy(
  doctorProfileId: string,
  tagIds: string[],
): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any).rpc("set_doctor_taxonomy", {
    p_doctor_id: doctorProfileId,
    p_tag_ids: tagIds,
  });
  if (error) throw error;
}

export async function getTaxonomyItems(): Promise<TaxonomyTag[]> {
  const { data, error } = await table("taxonomy_items")
    .select("id, label, kind")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return (data ?? []) as TaxonomyTag[];
}
