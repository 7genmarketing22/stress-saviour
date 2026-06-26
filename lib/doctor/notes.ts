export interface ParsedClinicalNotes {
  clinicalNote: string;
  prescription: { medication: string; dosage: string } | null;
}

const CLINICAL_MARKER = "---CLINICAL---";
const PRESCRIPTION_MARKER = "---PRESCRIPTION---";

export function parseClinicalNotes(raw: string | null): ParsedClinicalNotes {
  if (!raw?.trim()) {
    return { clinicalNote: "", prescription: null };
  }

  if (!raw.includes(CLINICAL_MARKER)) {
    return { clinicalNote: raw.trim(), prescription: null };
  }

  const parts = raw.split(PRESCRIPTION_MARKER);
  const clinicalPart = parts[0]?.replace(CLINICAL_MARKER, "").trim() ?? "";
  const prescriptionPart = parts[1]?.trim();

  let prescription: { medication: string; dosage: string } | null = null;
  if (prescriptionPart) {
    try {
      const parsed = JSON.parse(prescriptionPart);
      if (parsed?.medication) {
        prescription = {
          medication: String(parsed.medication),
          dosage: String(parsed.dosage ?? ""),
        };
      }
    } catch {
      prescription = null;
    }
  }

  return { clinicalNote: clinicalPart, prescription };
}

export function formatClinicalNotes(
  clinicalNote: string,
  prescription?: { medication: string; dosage: string } | null
): string {
  const note = clinicalNote.trim();
  if (!prescription?.medication?.trim()) {
    return note;
  }

  return `${CLINICAL_MARKER}\n${note}\n${PRESCRIPTION_MARKER}\n${JSON.stringify({
    medication: prescription.medication.trim(),
    dosage: prescription.dosage?.trim() ?? "",
  })}`;
}
