import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-slate-500">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
