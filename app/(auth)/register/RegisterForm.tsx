"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, Mail, Phone, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { createClient } from "@/lib/supabase/client";
import { PAKISTAN_CITIES } from "@/types";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().min(10, "Please enter a valid phone number"),
    city: z.string().min(1, "Please select your city"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/patient/dashboard";
  const role = searchParams.get("role") ?? "patient";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { city: "Lahore" },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: "patient",
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!authData.user) {
        setError("Registration failed. Please try again.");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase.from("profiles") as any).insert({
        id: authData.user.id,
        role: "patient",
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        city: data.city,
      });

      if (profileError) {
        setError(profileError.message);
        return;
      }

      if (!authData.session) {
        setSuccess(true);
        return;
      }

      router.refresh();
      router.push(redirect);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (role === "doctor") {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center lg:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Join as a Doctor</h1>
          <p className="text-sm text-slate-500">
            Doctor registration requires admin verification. Please contact our team to get started.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            Email us at{" "}
            <a href="mailto:doctors@stresssaviors.pk" className="font-medium text-teal-700">
              doctors@stresssaviors.pk
            </a>{" "}
            with your PMDC credentials and we&apos;ll guide you through onboarding.
          </p>
          <Link href="/login?role=doctor" className="mt-4 inline-block">
            <Button variant="outline">Already registered? Log in</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
        <p className="mt-3 text-sm text-slate-600">
          We&apos;ve sent a confirmation link to your email. Please verify your account, then log
          in to continue booking.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(redirect)}&role=patient`}
          className="mt-6 inline-block"
        >
          <Button className="bg-teal-600 text-white hover:bg-teal-700">Go to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-500">
          Sign up as a patient to book consultations with verified doctors.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="fullName"
                placeholder="Your full name"
                className="pl-10 border-slate-200"
                {...register("fullName")}
              />
            </div>
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10 border-slate-200"
                {...register("email")}
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="phone"
                  placeholder="03XX XXXXXXX"
                  className="pl-10 border-slate-200"
                  {...register("phone")}
                />
              </div>
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  id="city"
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
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
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
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 border-slate-200"
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-teal-600 font-semibold text-white hover:bg-teal-700 h-11"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href={`/login?redirect=${encodeURIComponent(redirect)}&role=patient`}
          className="font-medium text-teal-700 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
