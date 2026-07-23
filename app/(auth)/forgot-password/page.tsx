"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const siteUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
        "https://stress-saviour.vercel.app";

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password` }
      );

      if (resetError) {
        setError(getErrorMessage(resetError, "Unable to send reset email. Please try again."));
        return;
      }

      setSent(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-8 text-center space-y-4 shadow-sm">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900">Check your inbox</h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            We sent a password reset link to <span className="font-semibold text-slate-800">{email}</span>.
            Click the link in the email to set a new password.
          </p>
        </div>
        <p className="text-xs text-slate-400">
          Didn&apos;t receive it? Check your spam folder or{" "}
          <button
            onClick={() => setSent(false)}
            className="text-brand-600 hover:underline font-medium"
          >
            try again
          </button>
          .
        </p>
        <Link href="/login">
          <Button variant="outline" className="mt-2 gap-2 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center lg:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Forgot your password?</h1>
        <p className="text-sm text-slate-500">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10 border-slate-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold h-11 rounded-xl"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-brand-600 hover:underline font-medium">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Login
        </Link>
      </p>
    </div>
  );
}
