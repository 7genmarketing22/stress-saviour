import type { PatientPrescription } from "./types";

export const PRESCRIPTION_ITEMS_PER_PAGE = 6;

export type PrescriptionFilterType = "all" | "medication" | "treatment" | "with_file";
export type PrescriptionSortOption = "newest" | "oldest" | "doctor_asc" | "doctor_desc";
export type PrescriptionDateRange = "all" | "30d" | "90d" | "1y";

export type PrescriptionStatus = "new" | "has_file" | "medication" | "treatment";

const NEW_DAYS = 7;

export function getPrescriptionStatuses(prc: PatientPrescription): PrescriptionStatus[] {
  const statuses: PrescriptionStatus[] = [];
  const issuedAt = new Date(prc.date);
  const daysSince = (Date.now() - issuedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSince <= NEW_DAYS) statuses.push("new");
  if (prc.prescriptionUrl) statuses.push("has_file");
  if (prc.prescription) statuses.push("medication");
  else if (prc.clinicalNote) statuses.push("treatment");

  return statuses;
}

export function isWithinDateRange(date: string, range: PrescriptionDateRange): boolean {
  if (range === "all") return true;

  const issuedAt = new Date(date);
  const now = Date.now();
  const days: Record<Exclude<PrescriptionDateRange, "all">, number> = {
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };

  const limit = days[range];
  return now - issuedAt.getTime() <= limit * 24 * 60 * 60 * 1000;
}

export function filterPrescriptions(
  prescriptions: PatientPrescription[],
  options: {
    searchQuery: string;
    filterType: PrescriptionFilterType;
    specialization: string;
    dateRange: PrescriptionDateRange;
  }
): PatientPrescription[] {
  let filtered = [...prescriptions];
  const query = options.searchQuery.trim().toLowerCase();

  if (query) {
    filtered = filtered.filter((prc) => {
      const haystack = [
        prc.doctorName,
        prc.specialization,
        prc.prescription?.medication ?? "",
        prc.prescription?.dosage ?? "",
        prc.clinicalNote,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  if (options.filterType === "medication") {
    filtered = filtered.filter((prc) => Boolean(prc.prescription));
  } else if (options.filterType === "treatment") {
    filtered = filtered.filter((prc) => !prc.prescription && Boolean(prc.clinicalNote));
  } else if (options.filterType === "with_file") {
    filtered = filtered.filter((prc) => Boolean(prc.prescriptionUrl));
  }

  if (options.specialization !== "all") {
    filtered = filtered.filter((prc) => prc.specialization === options.specialization);
  }

  filtered = filtered.filter((prc) => isWithinDateRange(prc.date, options.dateRange));

  return filtered;
}

export function sortPrescriptions(
  prescriptions: PatientPrescription[],
  sortBy: PrescriptionSortOption
): PatientPrescription[] {
  const sorted = [...prescriptions];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "doctor_asc":
        return a.doctorName.localeCompare(b.doctorName);
      case "doctor_desc":
        return b.doctorName.localeCompare(a.doctorName);
      case "newest":
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  return sorted;
}

export function getUniqueSpecializations(prescriptions: PatientPrescription[]): string[] {
  return Array.from(new Set(prescriptions.map((prc) => prc.specialization))).sort();
}

export function getPrescriptionStats(prescriptions: PatientPrescription[]) {
  const withFile = prescriptions.filter((prc) => prc.prescriptionUrl).length;
  const withMedication = prescriptions.filter((prc) => prc.prescription).length;
  const recent = prescriptions.filter((prc) =>
    getPrescriptionStatuses(prc).includes("new")
  ).length;

  return {
    total: prescriptions.length,
    withFile,
    withMedication,
    recent,
  };
}

export function printPrescription(prc: PatientPrescription, patientName?: string) {
  const issuedDate = new Date(prc.date).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Prescription - ${prc.doctorName}</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #111; }
          h1 { font-size: 1.25rem; margin-bottom: 4px; }
          .meta { color: #555; font-size: 0.875rem; margin-bottom: 24px; }
          .section { margin-bottom: 20px; }
          .label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; font-weight: 600; margin-bottom: 6px; }
          .content { font-size: 0.95rem; line-height: 1.5; }
          .medication { font-weight: 600; font-size: 1rem; }
          hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
          .footer { font-size: 0.75rem; color: #888; margin-top: 32px; }
        </style>
      </head>
      <body>
        <h1>Stress Saviors — Prescription Summary</h1>
        <p class="meta">Issued: ${issuedDate}${patientName ? ` · Patient: ${patientName}` : ""}</p>
        <hr />
        <div class="section">
          <p class="label">Prescribing Doctor</p>
          <p class="content"><strong>${prc.doctorName}</strong><br />${prc.specialization}</p>
        </div>
        ${
          prc.prescription
            ? `<div class="section">
          <p class="label">Prescribed Medication</p>
          <p class="content medication">${prc.prescription.medication}</p>
          <p class="content">${prc.prescription.dosage}</p>
        </div>`
            : ""
        }
        ${
          prc.clinicalNote
            ? `<div class="section">
          <p class="label">${prc.prescription ? "Clinical Notes" : "Treatment Plan"}</p>
          <p class="content">${prc.clinicalNote.replace(/\n/g, "<br />")}</p>
        </div>`
            : ""
        }
        <p class="footer">Reference: ${prc.appointmentId.slice(0, 8).toUpperCase()} · Generated from Stress Saviors patient portal</p>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
