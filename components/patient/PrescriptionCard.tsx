"use client";

import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import type { PatientPrescription } from "@/lib/patient/types";
import { formatDate } from "@/lib/patient/mappers";
import {
  getPrescriptionStatuses,
  printPrescription,
  type PrescriptionStatus,
} from "@/lib/patient/prescriptions";

const STATUS_BADGES: Record<
  PrescriptionStatus,
  { label: string; className: string }
> = {
  new: { label: "New", className: "bg-violet-100 text-violet-800" },
  has_file: { label: "File attached", className: "bg-emerald-100 text-emerald-800" },
  medication: { label: "Medication", className: "bg-blue-100 text-blue-800" },
  treatment: { label: "Treatment plan", className: "bg-amber-100 text-amber-800" },
};

interface PrescriptionCardProps {
  prescription: PatientPrescription;
  patientName?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onViewDetails?: () => void;
}

export function PrescriptionCard({
  prescription: prc,
  patientName,
  expanded = false,
  onToggleExpand,
  onViewDetails,
}: PrescriptionCardProps) {
  const statuses = getPrescriptionStatuses(prc);
  const hasExpandableNote = Boolean(prc.clinicalNote && prc.prescription);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base">{prc.doctorName}</h3>
                  {statuses.map((status) => (
                    <span
                      key={status}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGES[status].className}`}
                    >
                      {STATUS_BADGES[status].label}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{prc.specialization}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Issued: {formatDate(prc.date, { year: "numeric", month: "long", day: "numeric" })}
              </span>
              {prc.clinicalNote && (
                <span className="flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" />
                  Clinical notes on file
                </span>
              )}
              <span className="text-[10px] font-mono bg-muted/50 px-2 py-0.5 rounded">
                Ref: {prc.appointmentId.slice(0, 8)}
              </span>
            </div>

            {prc.prescription ? (
              <div className="border-t border-border pt-3 text-sm space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Prescribed Medication
                </p>
                <p className="text-foreground font-medium">{prc.prescription.medication}</p>
                {prc.prescription.dosage && (
                  <p className="text-sm text-muted-foreground">{prc.prescription.dosage}</p>
                )}
              </div>
            ) : prc.clinicalNote ? (
              <div className="border-t border-border pt-3 text-sm space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Treatment Plan
                </p>
                <p className={`text-foreground ${expanded ? "" : "line-clamp-2"}`}>
                  {prc.clinicalNote}
                </p>
              </div>
            ) : null}

            {hasExpandableNote && (
              <div className="border-t border-border pt-3 text-sm space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Clinical Notes
                </p>
                <p className={`text-foreground ${expanded ? "" : "line-clamp-2"}`}>
                  {prc.clinicalNote}
                </p>
              </div>
            )}

            {hasExpandableNote && onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="text-xs text-brand-500 hover:underline flex items-center gap-1"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Show full notes
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2 shrink-0">
            {prc.prescriptionUrl ? (
              <a href={prc.prescriptionUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 w-full">
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </Button>
              </a>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 w-full"
                onClick={() => printPrescription(prc, patientName)}
              >
                <Printer className="h-4 w-4" />
                <span>Print summary</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="gap-1 w-full"
              onClick={onViewDetails}
            >
              <ExternalLink className="h-4 w-4" />
              <span>View details</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
