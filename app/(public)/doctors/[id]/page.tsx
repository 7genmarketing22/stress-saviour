import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { DoctorProfileClient } from "@/components/public/DoctorProfileClient";
import { getDoctorAvailabilityServer, getDoctorByIdServer } from "@/lib/public/doctors";

interface DoctorPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DoctorPageProps) {
  const { id } = await params;
  const doctor = await getDoctorByIdServer(id);
  if (!doctor) return { title: "Doctor Not Found | Stress Saviors" };

  const name = doctor.profile?.full_name ?? "Doctor";
  return {
    title: `${name} — ${doctor.specialization} | Stress Saviors`,
    description: doctor.bio ?? `Book a consultation with ${name}, ${doctor.specialization}.`,
  };
}

export default async function DoctorDetailPage({ params }: DoctorPageProps) {
  const { id } = await params;
  const [doctor, availabilitySlots] = await Promise.all([
    getDoctorByIdServer(id),
    getDoctorAvailabilityServer(id),
  ]);

  if (!doctor) notFound();

  return (
    <div className="min-h-screen bg-[#f8fafb]">
      <LandingHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Suspense fallback={null}>
          <DoctorProfileClient doctor={doctor} availabilitySlots={availabilitySlots} />
        </Suspense>
      </main>
      <LandingFooter />
    </div>
  );
}
