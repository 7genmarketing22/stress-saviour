"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  HeartPulse,
  User,
  Shield,
  Mail,
  Lock,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const roles: {
  role: UserRole;
  label: string;
  icon: typeof User;
  description: string;
  accent: string;
}[] = [
  {
    role: "patient",
    label: "Patient",
    icon: User,
    description: "Book and attend consultations",
    accent: "hover:border-teal-500 hover:bg-teal-50/80",
  },
  {
    role: "doctor",
    label: "Doctor",
    icon: HeartPulse,
    description: "Manage patients & schedule",
    accent: "hover:border-cyan-600 hover:bg-cyan-50/80",
  },
  {
    role: "admin",
    label: "Admin",
    icon: Shield,
    description: "Platform operations",
    accent: "hover:border-slate-600 hover:bg-slate-50",
  },
];

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-slate-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const roleParam = searchParams.get("role") as UserRole | null;

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(roleParam);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.refresh();

      if (redirectTo && selectedRole === "patient") {
        router.push(redirectTo);
      } else if (selectedRole === "patient") {
        router.push("/patient/dashboard");
      } else if (selectedRole === "doctor") {
        router.push("/doctor/dashboard");
      } else if (selectedRole === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleMeta = roles.find((r) => r.role === selectedRole);

  if (!selectedRole) {
    return (
      <div className="space-y-8">
        <div className="space-y-2 text-center lg:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in
          </h1>
          <p className="text-sm text-slate-500">
            Choose how you use Stress Saviors
          </p>
        </div>

        <div className="space-y-2">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.role}
                type="button"
                onClick={() => setSelectedRole(role.role)}
                className={cn(
                  "group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200",
                  role.accent
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-teal-100 group-hover:text-teal-700 transition-colors">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{role.label}</p>
                  <p className="text-sm text-slate-500 truncate">{role.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-500">
          New here?{" "}
          <Link
            href={
              redirectTo
                ? `/register?redirect=${encodeURIComponent(redirectTo)}`
                : "/register"
            }
            className="font-medium text-teal-700 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    );
  }

  const RoleIcon = selectedRoleMeta?.icon ?? User;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setSelectedRole(null)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Change role
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <RoleIcon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {selectedRoleMeta?.label} login
            </h1>
            <p className="text-sm text-slate-500">Enter your credentials</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10 border-slate-200 bg-slate-50/50 focus:bg-white"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-700">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-teal-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10 border-slate-200 bg-slate-50/50 focus:bg-white"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold h-11"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          href={
            redirectTo
              ? `/register?redirect=${encodeURIComponent(redirectTo)}`
              : "/register"
          }
          className="font-medium text-teal-700 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
