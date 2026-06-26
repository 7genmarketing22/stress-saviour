"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download, Calendar, Activity, FileText, Loader2 } from "lucide-react";
import { buildPrescriptions, getPatientAppointments } from "@/lib/patient/api";
import { formatDate } from "@/lib/patient/mappers";

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<ReturnType<typeof buildPrescriptions>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatientAppointments()
      .then((apts) => setPrescriptions(buildPrescriptions(apts)))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Prescriptions Directory</h2>
        <p className="text-sm text-muted-foreground">
          View clinical notes and prescriptions from your completed consultations.
        </p>
      </div>

      <div className="space-y-4">
        {prescriptions.length > 0 ? (
          prescriptions.map((prc) => (
            <Card key={prc.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">{prc.doctorName}</h3>
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
                    </div>
                    {prc.prescription ? (
                      <div className="border-t border-border pt-3 text-sm space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                          Prescribed Medication
                        </p>
                        <p className="text-foreground font-medium">{prc.prescription.medication}</p>
                        <p className="text-sm text-muted-foreground">{prc.prescription.dosage}</p>
                      </div>
                    ) : prc.clinicalNote ? (
                      <div className="border-t border-border pt-3 text-sm space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                          Treatment Plan
                        </p>
                        <p className="text-foreground">{prc.clinicalNote}</p>
                      </div>
                    ) : null}
                    {prc.prescriptionUrl && (
                      <a
                        href={prc.prescriptionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline inline-block"
                      >
                        View attached prescription document
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {prc.prescriptionUrl ? (
                      <a href={prc.prescriptionUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="gap-1">
                        <Download className="h-4 w-4" />
                        <span>No file</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-16 text-center border border-dashed rounded-xl">
            <FileText className="h-10 w-10 text-muted-foreground/60 mb-3 mx-auto" />
            <h4 className="font-semibold">No prescriptions found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Prescriptions and clinical notes appear here after your doctor completes a session.
            </p>
            <Link href="/patient/appointments">
              <Button className="mt-4" size="sm" variant="outline">View Appointments</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
