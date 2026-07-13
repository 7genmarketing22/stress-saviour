import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Heart,
  HelpCircle,
  Search as SearchIcon,
  Shield,
  Star,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { DoctorsBrowse } from "@/components/public/DoctorsBrowse";
import { DoctorSearchHero } from "@/components/public/DoctorSearchHero";
import { ConditionBrowse } from "@/components/public/ConditionBrowse";
import { ServiceQuickLinks } from "@/components/public/ServiceQuickLinks";
import { TestimonialsCarousel } from "@/components/public/TestimonialsCarousel";
import { getApprovedDoctorsServer } from "@/lib/public/doctors";
import { MENTAL_CONDITIONS, MENTAL_SYMPTOMS } from "@/lib/public/catalog";

const steps = [
  { step: "01", title: "Search & filter", description: "Pick your city, specialty, symptom, or doctor name.", icon: SearchIcon },
  { step: "02", title: "View profile", description: "See fees, schedule, reviews, and services offered.", icon: ClipboardList },
  { step: "03", title: "Book a slot", description: "Sign up or log in, then confirm your appointment.", icon: CalendarCheck },
  { step: "04", title: "Get care", description: "Join your secure video room or visit the clinic.", icon: Video },
];

const testimonials = [
  {
    quote:
      "I was nervous about seeking help online, but the process was simple. I found a psychologist in Lahore and had my first session within two days.",
    name: "Ayesha K.",
    city: "Lahore",
    role: "Patient",
    rating: 5,
  },
  {
    quote:
      "As someone living outside Pakistan, being able to consult a PMDC doctor in Urdu made all the difference for my family's mental health needs.",
    name: "Hassan R.",
    city: "Karachi",
    role: "Patient",
    rating: 5,
  },
  {
    quote:
      "The booking flow is straightforward — browse, pick a slot, sign up, and you're done. Exactly what telehealth should feel like.",
    name: "Fatima S.",
    city: "Islamabad",
    role: "Patient",
    rating: 5,
  },
  {
    quote:
      "My therapist was kind, professional, and genuinely listened. The video quality was great and I never felt rushed during my session.",
    name: "Bilal A.",
    city: "Rawalpindi",
    role: "Patient",
    rating: 5,
  },
  {
    quote:
      "Booking an evening appointment after work was a lifesaver. No traffic, no waiting rooms — just quality care from home.",
    name: "Sana M.",
    city: "Faisalabad",
    role: "Patient",
    rating: 5,
  },
  {
    quote:
      "I struggled with anxiety for years. Having a verified psychiatrist a few clicks away made it so much easier to finally ask for help.",
    name: "Usman T.",
    city: "Multan",
    role: "Patient",
    rating: 5,
  },
  {
    quote:
      "Transparent fees and clear doctor profiles helped me choose the right specialist with confidence. Highly recommended.",
    name: "Hira Z.",
    city: "Peshawar",
    role: "Patient",
    rating: 4,
  },
  {
    quote:
      "The follow-up reminders and prescription notes kept everything organized. This is how mental health care should work in Pakistan.",
    name: "Daniyal R.",
    city: "Sialkot",
    role: "Patient",
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
    <div className="min-h-screen bg-brand-50/40">
      <LandingHeader />

      <main>
        {/* Hero + Search */}
        <section className="relative z-20 border-b border-brand-100/80 bg-gradient-to-b from-white via-brand-50/30 to-brand-50/40">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-brand-100/20 blur-3xl" />
            <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-brand-100/30 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            <DoctorSearchHero doctorCount={doctorCount} doctors={doctors} />
          </div>
        </section>

        {/* Service cards */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl">
            How can we help you today?
          </h2>
          <ServiceQuickLinks />
        </section>

        {/* Behavioral Health Assessment CTA Section */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-brand-100/80 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-6 sm:p-8 md:p-10 text-white shadow-lg">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Free Self-Screening Assessment
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold">
                  Take a Behavioral Assessment Test
                </h3>
                <p className="text-white/90 text-sm sm:text-base leading-relaxed">
                  Understand your mental well-being with our clinically backed self-assessments (Anxiety & Anger PROMIS Short Forms). Get instant diagnostic indicators and recommendations for verified PMDC specialists.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link href="/assessment">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white text-brand-700 hover:bg-brand-50 font-semibold shadow-md shadow-brand-900/10 gap-2 h-12 px-6"
                  >
                    Start Free Assessment
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Brand banner */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
          <div className="group relative overflow-hidden rounded-[2rem] border border-brand-50/80 bg-white shadow-sm ring-1 ring-slate-100">
            <Image
              src="/stress_savious_banner.png"
              alt="Stress Savious — Your Well-being, Our Priority. Caring for headache, insomnia, and anxiety."
              width={1024}
              height={576}
              priority
              sizes="(max-width: 1152px) 100vw, 1152px"
              className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
        </section>

        {/* Symptoms & Diseases */}
        <section className="border-y border-slate-200/80 bg-white py-12 sm:py-14">
          <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6">
            <ConditionBrowse
              title="Symptoms"
              items={MENTAL_SYMPTOMS}
              type="symptom"
              viewAllHref="/browse/symptoms"
            />
            <ConditionBrowse
              title="Conditions"
              items={MENTAL_CONDITIONS}
              type="condition"
              viewAllHref="/browse/conditions"
            />
          </div>
        </section>

        {/* Trust strip */}
        <section className="bg-brand-800 py-10 text-white">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:px-6 md:grid-cols-4">
            {trustBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div key={badge.label} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5 text-brand-200" />
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
        <section id="how-it-works" className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                Simple &amp; fast
              </span>
              <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">How it works</h2>
              <p className="mt-3 text-slate-600">
                From search to your first session — four simple steps.
              </p>
            </div>

            <div className="relative mt-14">
              {/* Connecting line (desktop) */}
              <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-brand-100 to-transparent lg:block" />

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
                {steps.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.step} className="group relative flex flex-col items-center text-center">
                      {/* Icon node */}
                      <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-50 bg-brand-50 text-brand-600 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-brand-100 group-hover:bg-brand-50">
                        <Icon className="h-6 w-6" />
                        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold text-brand-600 shadow-sm ring-1 ring-slate-100">
                          {i + 1}
                        </span>
                      </div>

                      <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition-all duration-300 group-hover:border-brand-100 group-hover:bg-white group-hover:shadow-md">
                        <h3 className="font-bold text-slate-900">{s.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link href="/doctors">
                <Button
                  size="lg"
                  className="group gap-2 bg-brand-500 px-7 font-semibold text-white shadow-md hover:bg-brand-600"
                >
                  Search Doctors Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Why Stress Saviors — feature rows */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                <Heart className="h-3.5 w-3.5 text-brand-500" />
                Why Stress Saviors
              </span>
              <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                Care that fits your life
              </h2>
              <p className="mt-3 text-slate-600">
                From verified specialists to secure video sessions — everything you
                need for your mental wellbeing, in one place.
              </p>
            </div>

            <div className="mt-14 space-y-16 lg:mt-16 lg:space-y-24">
              {/* Row 1 — Verified doctors (portraits collage) */}
              <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <div className="order-2 lg:order-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                    <Shield className="h-3.5 w-3.5" />
                    PMDC Verified
                  </span>
                  <h3 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
                    Specialists you can truly trust
                  </h3>
                  <p className="mt-3 leading-relaxed text-slate-600">
                    Every doctor on Stress Saviors is a licensed, PMDC-verified
                    professional. Browse detailed profiles with real ratings, fees,
                    and the languages they consult in.
                  </p>
                  <ul className="mt-5 space-y-3">
                    {[
                      "Licensed psychologists & psychiatrists only",
                      "Consultations in Urdu and English",
                      "Transparent fees and genuine patient reviews",
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link href="/doctors" className="mt-7 inline-block">
                    <Button className="group gap-2 bg-brand-500 font-semibold text-white hover:bg-brand-600">
                      Browse Doctors
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                </div>

                <div className="order-1 lg:order-2">
                  <div className="mx-auto grid max-w-md grid-cols-2 gap-4 sm:gap-5">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-md ring-1 ring-slate-100 lg:translate-y-6">
                      <Image
                        src="/doc_female_portrait.png"
                        alt="PMDC-verified female doctor at Stress Saviors"
                        width={819}
                        height={819}
                        sizes="(max-width: 640px) 45vw, 260px"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-md ring-1 ring-slate-100 lg:-translate-y-2">
                      <Image
                        src="/doc_male_portrait.png"
                        alt="PMDC-verified male doctor at Stress Saviors"
                        width={819}
                        height={819}
                        sizes="(max-width: 640px) 45vw, 260px"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2 — Online consultation (image left) */}
              <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-md ring-1 ring-slate-100">
                  <Image
                    src="/online_consultation.png"
                    alt="Secure online video consultation with a doctor"
                    width={1024}
                    height={768}
                    sizes="(max-width: 1024px) 100vw, 540px"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                    <Video className="h-3.5 w-3.5" />
                    Telehealth
                  </span>
                  <h3 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
                    Consult securely from anywhere
                  </h3>
                  <p className="mt-3 leading-relaxed text-slate-600">
                    Skip the traffic and waiting rooms. Connect with your doctor over
                    a private, encrypted video call — from home, work, or anywhere in
                    the world.
                  </p>
                  <ul className="mt-5 space-y-3">
                    {[
                      "Private, end-to-end encrypted video sessions",
                      "Evening and weekend slots available",
                      "Digital prescriptions and follow-up notes",
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Row 3 — Wellbeing (image right) */}
              <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <div className="order-2 lg:order-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                    <Heart className="h-3.5 w-3.5" />
                    Lasting wellbeing
                  </span>
                  <h3 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
                    Support that goes beyond a single session
                  </h3>
                  <p className="mt-3 leading-relaxed text-slate-600">
                    Healing is a journey. Stay on track with ongoing care, gentle
                    reminders, and a calmer routine designed around your everyday
                    wellbeing.
                  </p>
                  <ul className="mt-5 space-y-3">
                    {[
                      "Continuity of care with your chosen doctor",
                      "Appointment reminders so you never miss a step",
                      "A safe, judgment-free space to grow",
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="order-1 overflow-hidden rounded-3xl border border-slate-200 shadow-md ring-1 ring-slate-100 lg:order-2">
                  <Image
                    src="/wellness_concept.png"
                    alt="A woman relaxing calmly with a cup of tea"
                    width={1024}
                    height={768}
                    sizes="(max-width: 1024px) 100vw, 540px"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Know the signs */}
        <section className="bg-gradient-to-b from-[#eef7fb] to-white py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14">
            <div className="relative order-1">
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2.5rem] bg-brand-50/40 blur-2xl" />
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-md ring-1 ring-slate-100">
                <Image
                  src="/symptoms_illustrations.png"
                  alt="Common signs of mental health struggles: stress, fatigue, cognitive issues, and depression"
                  width={1024}
                  height={1024}
                  sizes="(max-width: 1024px) 100vw, 520px"
                  className="h-full w-full rounded-2xl object-cover"
                />
              </div>
            </div>

            <div className="order-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                Know the signs
              </span>
              <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                Recognize it early, act with confidence
              </h2>
              <p className="mt-3 leading-relaxed text-slate-600">
                Mental health struggles often show up in everyday ways. If any of
                these feel familiar, you don&apos;t have to face them alone — the
                right specialist is just a few clicks away.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { label: "Stress", desc: "Constant worry or tension" },
                  { label: "Fatigue", desc: "Low energy that won't lift" },
                  { label: "Cognitive issues", desc: "Trouble focusing or recalling" },
                  { label: "Depression", desc: "Persistent low mood" },
                ].map((sign) => (
                  <div
                    key={sign.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-brand-100 hover:shadow-sm"
                  >
                    <p className="font-semibold text-slate-900">{sign.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{sign.desc}</p>
                  </div>
                ))}
              </div>

              <Link href="/doctors" className="mt-7 inline-block">
                <Button className="group gap-2 bg-brand-500 font-semibold text-white hover:bg-brand-600">
                  Find the Right Specialist
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                <Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />
                Loved by patients across Pakistan
              </span>
              <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                What patients are saying
              </h2>
              <p className="mt-3 text-slate-600">
                Real stories from people who found the right care through Stress Saviors.
              </p>
            </div>
            <div className="mt-10">
              <TestimonialsCarousel testimonials={testimonials} />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-gradient-to-b from-white to-slate-50/60 py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.6fr] lg:gap-14">
            {/* Left: heading + help card */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                <HelpCircle className="h-3.5 w-3.5" />
                Got questions?
              </span>
              <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                Frequently asked questions
              </h2>
              <p className="mt-3 text-slate-600">
                Everything you need to know about booking and consulting on Stress Saviors.
                Our support team is available 15/7 to guide you.
              </p>
              <Link href="/register" className="mt-6 inline-block">
                <Button className="gap-2 bg-brand-500 text-white hover:bg-brand-600">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Right: accordion */}
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <details
                  key={faq.q}
                  className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition-all open:border-brand-100 open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 transition-colors group-open:bg-brand-50 group-open:text-brand-600">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 font-semibold text-slate-900">{faq.q}</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg leading-none text-brand-500 transition-transform duration-300 group-open:rotate-45 group-open:border-brand-200 group-open:bg-brand-50">
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-5 pl-16 text-sm leading-relaxed text-slate-600">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[2rem] border border-brand-100/80 bg-gradient-to-b from-white via-brand-50/40 to-brand-50/40 shadow-sm">
              {/* Soft glows */}
              <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-100/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-100/30 blur-3xl" />

              <div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 py-14 text-center sm:px-12 sm:py-16">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-100/80 bg-white/70 px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur">
                  <Heart className="h-3.5 w-3.5 text-brand-500" />
                  Your mental wellbeing matters
                </span>
                <h2 className="mt-5 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                  Ready to take the first step?
                </h2>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
                  Search by city, browse symptoms, or pick a doctor — book a secure
                  consultation in just a few minutes.
                </p>

                <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <Link href="/doctors">
                    <Button
                      size="lg"
                      className="group w-full gap-2 bg-brand-500 font-semibold text-white shadow-md hover:bg-brand-600 sm:w-auto"
                    >
                      Find a Doctor
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-slate-300 font-semibold text-slate-700 hover:bg-white sm:w-auto"
                    >
                      Sign Up Free
                    </Button>
                  </Link>
                </div>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  {[
                    { icon: CheckCircle2, label: "No account needed to browse" },
                    { icon: Shield, label: "100% confidential" },
                  ].map((point) => {
                    const Icon = point.icon;
                    return (
                      <span
                        key={point.label}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500"
                      >
                        <Icon className="h-4 w-4 text-brand-500" />
                        {point.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
