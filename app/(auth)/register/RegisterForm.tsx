"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
  MapPin,
  Stethoscope,
  FileText,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { createClient } from "@/lib/supabase/client";
import { PAKISTAN_CITIES, SPECIALIZATIONS } from "@/types";
import { MENTAL_CONDITIONS, MENTAL_SYMPTOMS } from "@/lib/public/catalog";
import { TaxonomyTagPicker } from "@/components/shared/TaxonomyTagPicker";
import { setDoctorTaxonomy } from "@/lib/doctor/taxonomy-api";
import { cn } from "@/lib/utils";
import { formatRegisterError } from "@/lib/errors";

const accountFieldsSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  city: z.string().min(1, "Please select your city"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
});

const passwordMatchRefine = {
  check: (data: { password: string; confirmPassword: string }) =>
    data.password === data.confirmPassword,
  params: {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  },
};

const baseSchema = accountFieldsSchema.refine(
  passwordMatchRefine.check,
  passwordMatchRefine.params
);

const doctorSchema = accountFieldsSchema
  .extend({
    pmdcNumber: z.string().min(4, "Enter your PMDC registration number"),
    specialization: z.string().min(1, "Select your specialization"),
    taxonomyTags: z.array(z.string()).min(1, "Select at least one symptom or condition you treat"),
    qualification: z.string().min(2, "Enter your primary qualification"),
    experienceYears: z.number().min(0, "Experience must be 0 or more"),
    consultationFee: z.number().min(0, "Fee must be 0 or more"),
    bio: z.string().optional(),
  })
  .refine(passwordMatchRefine.check, passwordMatchRefine.params);

type PatientFormValues = z.infer<typeof baseSchema>;
type DoctorFormValues = z.infer<typeof doctorSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/patient/dashboard";
  const roleParam = searchParams.get("role") === "doctor" ? "doctor" : "patient";

  const [accountType, setAccountType] = useState<"patient" | "doctor">(roleParam);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [doctorTaxonomyTags, setDoctorTaxonomyTags] = useState<string[]>([]);
  const supabase = createClient();

  const switchAccountType = useCallback(
    (type: "patient" | "doctor") => {
      setAccountType(type);
      const params = new URLSearchParams(searchParams.toString());
      params.set("role", type);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const patientForm = useForm<PatientFormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: { city: "Lahore" },
  });

  const doctorForm = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      city: "Lahore",
      specialization: "Psychiatrist",
      experienceYears: 0,
      consultationFee: 3000,
      taxonomyTags: [],
    },
  });

  const registerAccount = async (
    data: PatientFormValues | DoctorFormValues,
    role: "patient" | "doctor"
  ) => {
    setLoading(true);
    setError(null);

    try {
      const metadata: Record<string, string | number | string[]> = {
        full_name: data.fullName,
        role,
        phone: data.phone,
        city: data.city,
      };

      if (role === "doctor") {
        const doc = data as DoctorFormValues;
        metadata.pmdc_number = doc.pmdcNumber;
        metadata.specialization = doc.specialization;
        metadata.qualification = doc.qualification;
        metadata.experience_years = doc.experienceYears;
        metadata.consultation_fee = doc.consultationFee;
        metadata.taxonomy_tags = doc.taxonomyTags;
        if (doc.bio?.trim()) metadata.bio = doc.bio.trim();
      }

      // Use NEXT_PUBLIC_APP_URL (set in Vercel env vars) so the confirmation
      // email always points to the live site, never localhost.
      const siteUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
        "https://stress-saviour.vercel.app";

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: metadata,
          emailRedirectTo: `${siteUrl}/auth/callback?next=/login`,
        },
      });

      if (signUpError) {
        setError(formatRegisterError(signUpError));
        return;
      }

      if (!authData.user) {
        setError("Registration failed. Please try again.");
        return;
      }

      if (!authData.session) {
        setNeedsEmailConfirm(true);
        setSuccess(true);
        return;
      }

      if (role === "doctor") {
        const doc = data as DoctorFormValues;
        try {
          const { data: doctorProfile } = await supabase
            .from("doctor_profiles")
            .select("id")
            .eq("user_id", authData.user.id)
            .maybeSingle<{ id: string }>();

          if (doctorProfile?.id && doc.taxonomyTags.length > 0) {
            await setDoctorTaxonomy(doctorProfile.id, doc.taxonomyTags);
          }
        } catch (taxonomyErr) {
          // Account + doctor profile already created; taxonomy can be set later in profile.
          console.warn("Doctor taxonomy sync after signup failed", taxonomyErr);
        }
      }

      router.refresh();
      router.push("/pending-review");
    } catch (err) {
      setError(formatRegisterError(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">
          {needsEmailConfirm ? "Check your email" : "Application submitted"}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {needsEmailConfirm
            ? "We sent a confirmation link to your email. After verifying, log in — your account will show as pending review until an administrator approves it."
            : "Your registration was received. An administrator will review your account before you can access the dashboard."}
        </p>
        <Link
          href={`/login?role=${accountType}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`}
          className="mt-6 inline-block"
        >
          <Button className="bg-brand-500 text-white hover:bg-brand-600">Go to Login</Button>
        </Link>
      </div>
    );
  }

  const loginHref = `/login?role=${accountType}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-500">
          Register as a {accountType === "doctor" ? "doctor" : "patient"}. Accounts are reviewed by
          an administrator before dashboard access is granted.
        </p>
      </div>

      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        {(["patient", "doctor"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => switchAccountType(type)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
              accountType === type
                ? "bg-white text-brand-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {type === "patient" ? "Patient" : "Doctor"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {accountType === "patient" ? (
          <form
            onSubmit={patientForm.handleSubmit((data) => registerAccount(data, "patient"))}
            className="space-y-4"
          >
            <AccountFields
              register={patientForm.register}
              errors={patientForm.formState.errors}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />
            {error && <ErrorBanner message={error} />}
            <Button
              type="submit"
              className="w-full bg-brand-500 font-semibold text-white hover:bg-brand-600 h-11"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create Patient Account"}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={doctorForm.handleSubmit((data) =>
              registerAccount({ ...data, taxonomyTags: doctorTaxonomyTags }, "doctor"),
            )}
            className="space-y-4"
          >
            <AccountFields
              register={doctorForm.register as unknown as ReturnType<typeof useForm<PatientFormValues>>["register"]}
              errors={doctorForm.formState.errors}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="PMDC Number" error={doctorForm.formState.errors.pmdcNumber?.message}>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Your unique PMDC / PMC number"
                    className="pl-10 border-slate-200"
                    {...doctorForm.register("pmdcNumber")}
                  />
                </div>
              </Field>
              <Field label="Specialization" error={doctorForm.formState.errors.specialization?.message}>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-background pl-10 pr-3 text-sm"
                    {...doctorForm.register("specialization")}
                  >
                    {SPECIALIZATIONS.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>

            <Field
              label="Symptoms & conditions you treat"
              error={doctorForm.formState.errors.taxonomyTags?.message}
            >
              <TaxonomyTagPicker
                items={[...MENTAL_SYMPTOMS, ...MENTAL_CONDITIONS]}
                symptoms={MENTAL_SYMPTOMS}
                conditions={MENTAL_CONDITIONS}
                selectedIds={doctorTaxonomyTags}
                onChange={(ids) => {
                  setDoctorTaxonomyTags(ids);
                  doctorForm.setValue("taxonomyTags", ids, { shouldValidate: true });
                }}
                groupByKind
              />
              <p className="mt-2 text-xs text-slate-500">
                Select every area you are qualified to treat. Admins review these during approval.
              </p>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Qualification" error={doctorForm.formState.errors.qualification?.message}>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="MBBS, FCPS…"
                    className="pl-10 border-slate-200"
                    {...doctorForm.register("qualification")}
                  />
                </div>
              </Field>
              <Field label="Experience (years)" error={doctorForm.formState.errors.experienceYears?.message}>
                <Input
                  type="number"
                  min={0}
                  className="border-slate-200"
                  {...doctorForm.register("experienceYears", { valueAsNumber: true })}
                />
              </Field>
            </div>

            <Field label="Consultation fee (PKR)" error={doctorForm.formState.errors.consultationFee?.message}>
              <Input
                type="number"
                min={0}
                className="border-slate-200"
                {...doctorForm.register("consultationFee", { valueAsNumber: true })}
              />
            </Field>

            <Field label="Bio (optional)" error={doctorForm.formState.errors.bio?.message}>
              <textarea
                rows={3}
                placeholder="Brief professional background…"
                className="flex w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-sm"
                {...doctorForm.register("bio")}
              />
            </Field>

            {error && <ErrorBanner message={error} />}
            <Button
              type="submit"
              className="w-full bg-brand-500 font-semibold text-white hover:bg-brand-600 h-11"
              disabled={loading}
            >
              {loading ? "Submitting application…" : "Submit Doctor Application"}
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  const text =
    !message || message.trim() === "{}"
      ? "Registration failed. Please check your details and try again."
      : message;

  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
      {text}
    </p>
  );
}

function AccountFields({
  register,
  errors,
  showPassword,
  setShowPassword,
}: {
  register: ReturnType<typeof useForm<PatientFormValues>>["register"];
  errors: ReturnType<typeof useForm<PatientFormValues>>["formState"]["errors"];
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
}) {
  return (
    <>
      <Field label="Full Name" error={errors.fullName?.message}>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Your full name" className="pl-10 border-slate-200" {...register("fullName")} />
        </div>
      </Field>

      <Field label="Email" error={errors.email?.message}>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input type="email" placeholder="you@example.com" className="pl-10 border-slate-200" {...register("email")} />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" error={errors.phone?.message}>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="03XX XXXXXXX" className="pl-10 border-slate-200" {...register("phone")} />
          </div>
        </Field>
        <Field label="City" error={errors.city?.message}>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-background pl-10 pr-3 text-sm"
              {...register("city")}
            >
              {PAKISTAN_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </Field>
      </div>

      <Field label="Password" error={errors.password?.message}>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-10 pr-10 border-slate-200"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <Field label="Confirm Password" error={errors.confirmPassword?.message}>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-10 border-slate-200"
            {...register("confirmPassword")}
          />
        </div>
      </Field>
    </>
  );
}
