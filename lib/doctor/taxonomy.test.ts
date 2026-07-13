import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { doctorHasTaxonomyTag, matchesDoctorTaxonomyTag } from "./taxonomy.ts";

const PTSD_ITEM = {
  keywords: ["ptsd", "trauma", "post traumatic"],
  specialty: "Psychiatrist",
};

const PANIC_ITEM = {
  keywords: ["panic", "attack", "anxiety"],
  specialty: "Psychiatrist",
};

describe("taxonomy tag matching", () => {
  it("matches doctors with stored PTSD tag", () => {
    const doctor = {
      specialization: "Psychiatrist",
      taxonomy_tags: [{ id: "ptsd", label: "PTSD", kind: "condition" as const }],
    };
    assert.equal(doctorHasTaxonomyTag(doctor, "ptsd"), true);
    assert.equal(matchesDoctorTaxonomyTag(doctor, "ptsd", PTSD_ITEM), true);
  });

  it("excludes doctors tagged for other conditions", () => {
    const doctor = {
      specialization: "Psychologist",
      taxonomy_tags: [{ id: "anxiety-disorder", label: "Anxiety Disorder", kind: "condition" as const }],
    };
    assert.equal(matchesDoctorTaxonomyTag(doctor, "ptsd", PTSD_ITEM), false);
  });

  it("uses legacy keyword fallback only when doctor has no tags", () => {
    const doctor = {
      specialization: "Psychiatrist",
      bio: "Experienced in treating panic attacks and acute anxiety.",
      taxonomy_tags: [],
    };
    assert.equal(matchesDoctorTaxonomyTag(doctor, "panic-attacks", PANIC_ITEM), true);
  });
});
