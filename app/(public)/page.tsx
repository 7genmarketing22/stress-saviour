import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Calendar,
  Heart,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { DoctorsBrowse } from "@/components/public/DoctorsBrowse";
import { DoctorSearchHero } from "@/components/public/DoctorSearchHero";
import { ConditionBrowse } from "@/components/public/ConditionBrowse";
import { ServiceQuickLinks, SpecialtyQuickLinks } from "@/components/public/ServiceQuickLinks";
import { getApprovedDoctorsServer } from "@/lib/public/doctors";
import { MENTAL_CONDITIONS, MENTAL_SYMPTOMS } from "@/lib/public/catalog";

const steps = [
  { step: "01", title: "Search & filter", description: "Pick your city, specialty, symptom, or doctor name." },
  { step: "02", title: "View profile", description: "See fees, schedule, reviews, and services offered." },
  { step: "03", title: "Book a slot", description: "Sign up or log in, then confirm your appointment." },
  { step: "04", title: "Get care", description: "Join your secure video room or visit the clinic." },
];

const testimonials = [
  {
    quote:
      "I was nervous about seeking help online, but the process was simple. I found a psychologist in Lahore and had my first session within two days.",
    name: "Ayesha K.",
    city: "Lahore",
    rating: 5,
  },
  {
    quote:
      "As someone living outside Pakistan, being able to consult a PMDC doctor in Urdu made all the difference for my family's mental health needs.",
    name: "Hassan R.",
    city: "Karachi",
    rating: 5,
  },
  {
    quote:
      "The booking flow is straightforward — browse, pick a slot, sign up, and you're done. Exactly what telehealth should feel like.",
    name: "Fatima S.",
    city: "Islamabad",
    rating: 5,
  },
];

const faqs = [
  {
    q: "Do I need an account to browse doctors?",
    a: "No — you can explore all verified doctors and view their profiles without signing up. You'll only need an account when you're ready to book a slot.",
  },
  {
    q: "How do I book an appointment?",
    a: "Use the search bar to filter by city and specialty, open a doctor's profile, click Book a Slot, then sign up or log in as a patient.",
  },
  {
    q: "Are consultations confidential?",
    a: "Yes. All sessions are private and encrypted. Your health information is protected under our platform policies.",
  },
  {
    q: "What languages are supported?",
    a: "Most doctors offer consultations in Urdu and English. Language preferences are listed on each doctor's profile.",
  },
];

const trustBadges = [
  { icon: Shield, label: "PMDC Verified Doctors", sub: "Licensed professionals only" },
  { icon: Users, label: "15/7 Support", sub: "Trained & supportive team" },
  { icon: Calendar, label: "Instant Booking", sub: "Same-week appointments" },
  { icon: Star, label: "Patient Reviews", sub: "Real ratings & feedback" },
];

export default async function HomePage() {
  let doctors: Awaited<ReturnType<typeof getApprovedDoctorsServer>> = [];
  try {
    doctors = await getApprovedDoctorsServer();
  } catch {
    doctors = [];
  }

  const doctorCount = doctors.length;

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <LandingHeader />

      <main>
        {/* Hero + Search */}
        <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white via-teal-50/30 to-[#f4f7fa]">
          <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-teal-200/20 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            <DoctorSearchHero doctorCount={doctorCount} />
            <div className="mt-8">
              <SpecialtyQuickLinks />
            </div>
          </div>
        </section>

        {/* Service cards */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl">
            How can we help you today?
          </h2>
          <ServiceQuickLinks />
        </section>

        {/* Symptoms & Diseases */}
        <section className="border-y border-slate-200/80 bg-white py-12 sm:py-14">
          <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6">
            <ConditionBrowse
              title="Symptoms"
              items={MENTAL_SYMPTOMS}
              type="symptom"
              viewAllHref="/doctors"
            />
            <ConditionBrowse
              title="Conditions"
              items={MENTAL_CONDITIONS}
              type="condition"
              viewAllHref="/doctors"
            />
          </div>
        </section>

        {/* Trust strip */}
        <section className="bg-[#1e3a5f] py-10 text-white">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:px-6 md:grid-cols-4">
            {trustBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div key={badge.label} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5 text-teal-300" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{badge.label}</p>
                    <p className="text-xs text-slate-300">{badge.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Featured doctors */}
        {doctors.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <Suspense fallback={null}>
              <DoctorsBrowse
                initialDoctors={doctors}
                title="Top Mental Health Doctors"
                subtitle="Highly rated PMDC-verified professionals. Book video or in-clinic consultations instantly."
                limit={3}
                layout="grid"
                showFilters={false}
              />
            </Suspense>
          </section>
        )}

        {/* How it works */}
        <section id="how-it-works" className="bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">How it works</h2>
              <p className="mt-3 text-slate-600">
                From search to your first session — four simple steps.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <div
                  key={s.step}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6"
                >
                  <span className="text-3xl font-bold text-teal-200">{s.step}</span>
                  <h3 className="mt-2 font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{s.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/doctors">
                <Button className="gap-2 bg-teal-600 text-white hover:bg-teal-700">
                  Search Doctors Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
              What patients are saying
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                      {t.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.city}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">FAQ</h2>
            <div className="mt-10 space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border border-slate-200 bg-slate-50/50 open:bg-white open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {faq.q}
                      <span className="text-teal-600 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="border-t border-slate-100 px-5 pb-4 pt-3 text-sm leading-relaxed text-slate-600">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1e3a5f] to-teal-700 px-8 py-14 text-center text-white shadow-xl sm:px-12">
              <Heart className="mx-auto h-10 w-10 text-teal-300" />
              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">Ready to take the first step?</h2>
              <p className="mx-auto mt-3 max-w-lg text-teal-100">
                Search by city, browse symptoms, or pick a doctor — book your slot in minutes.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/doctors">
                  <Button size="lg" className="bg-white font-semibold text-[#1e3a5f] hover:bg-teal-50">
                    Find a Doctor
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/40 bg-transparent font-semibold text-white hover:bg-white/10"
                  >
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
