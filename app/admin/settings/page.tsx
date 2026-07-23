"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useAdmin } from "@/contexts/AdminContext";
import { createClient } from "@/lib/supabase/client";
import type { PaymentAccount } from "@/app/api/admin/settings/payment-accounts/route";
import {
  User,
  Lock,
  CreditCard,
  Camera,
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Building2,
  Smartphone,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Bell,
  Info,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "password", label: "Password", icon: Lock },
  { id: "payments", label: "Payment Accounts", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;
type Tab = (typeof TABS)[number]["id"];

const PAYMENT_METHODS = [
  { value: "jazzcash", label: "JazzCash", icon: Smartphone },
  { value: "easypaisa", label: "EasyPaisa", icon: Smartphone },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "hbl", label: "HBL", icon: Building2 },
  { value: "ubl", label: "UBL", icon: Building2 },
  { value: "meezan", label: "Meezan Bank", icon: Building2 },
  { value: "allied", label: "Allied Bank", icon: Building2 },
  { value: "mcb", label: "MCB Bank", icon: Building2 },
  { value: "standard_chartered", label: "Standard Chartered", icon: Building2 },
  { value: "other", label: "Other", icon: Building2 },
];

const METHOD_ICON: Record<string, React.FC<{ className?: string }>> = {
  jazzcash: Smartphone,
  easypaisa: Smartphone,
};
function getMethodIcon(method: string) {
  return METHOD_ICON[method] ?? Building2;
}

function methodLabel(method: string) {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

const emptyAccount = (): Omit<PaymentAccount, "id" | "created_at" | "updated_at" | "created_by"> => ({
  method: "jazzcash",
  account_title: "",
  account_number: "",
  bank_name: null,
  iban: null,
  instructions: null,
  is_active: true,
  display_order: 0,
});

function Toast({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-lg text-sm font-medium transition-all ${
        type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {type === "success" ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      {message}
      <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100">
        <XCircle className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { profile, refresh } = useAdmin();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your profile, security, payment accounts, and platform preferences
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === id
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <ProfileTab profile={profile} onRefresh={refresh} showToast={showToast} />
      )}
      {activeTab === "password" && (
        <PasswordTab showToast={showToast} />
      )}
      {activeTab === "payments" && (
        <PaymentAccountsTab showToast={showToast} />
      )}
      {activeTab === "notifications" && (
        <NotificationsTab showToast={showToast} />
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

/* ─────────────── PROFILE TAB ─────────────── */
function ProfileTab({
  profile,
  onRefresh,
  showToast,
}: {
  profile: import("@/types").Profile;
  onRefresh: () => Promise<void>;
  showToast: (type: "success" | "error", message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: profile.full_name,
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    avatar_url: profile.avatar_url ?? "",
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("error", "Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "Image must be smaller than 2 MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setForm((p) => ({ ...p, avatar_url: urlData.publicUrl }));
      showToast("success", "Avatar uploaded — save profile to apply.");
    } catch (err) {
      showToast("error", getErrorMessage(err, "Upload failed."));
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setForm((p) => ({ ...p, avatar_url: "" }));
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      showToast("error", "Full name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          avatar_url: form.avatar_url || null,
        }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to save");
      await onRefresh();
      showToast("success", "Profile updated successfully.");
    } catch (err) {
      showToast("error", getErrorMessage(err, "Failed to save profile."));
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Photo</CardTitle>
          <CardDescription>Upload a photo. Max 2 MB (JPG, PNG, WebP).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              {form.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.avatar_url}
                  alt="Avatar"
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-brand-200"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-brand-200">
                  {initials}
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Camera className="h-4 w-4 mr-2" />
                {uploadingAvatar ? "Uploading…" : "Upload Photo"}
              </Button>
              {form.avatar_url && (
                <Button size="sm" variant="outline" onClick={handleRemoveAvatar} className="text-red-600 hover:bg-red-50">
                  <XCircle className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription>Update your name, phone, and city.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" value={profile.email} disabled className="bg-slate-50 text-slate-500" />
              <p className="text-xs text-slate-400">Email cannot be changed here.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                placeholder="+92 300 0000000"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Karachi"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
          </div>

          {/* Read-only info */}
          <div className="border-t border-slate-100 pt-4 grid sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Role</p>
              <p className="text-sm font-medium mt-0.5 capitalize">{profile.role.replace("_", " ")}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Account Status</p>
              <p className="text-sm font-medium mt-0.5 text-green-700 capitalize">{profile.account_status}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Member Since</p>
              <p className="text-sm font-medium mt-0.5">
                {new Date(profile.created_at).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Account ID</p>
              <p className="font-mono text-xs mt-0.5 text-slate-600">{profile.id.slice(0, 16)}…</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────── PASSWORD TAB ─────────────── */
function PasswordTab({ showToast }: { showToast: (t: "success" | "error", m: string) => void }) {
  const [form, setForm] = useState({ newPass: "", confirmPass: "" });
  const [show, setShow] = useState({ newPass: false, confirmPass: false });
  const [saving, setSaving] = useState(false);

  const strength = (() => {
    const p = form.newPass;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-600"][strength];

  const handleSave = async () => {
    if (form.newPass.length < 8) return showToast("error", "Password must be at least 8 characters.");
    if (form.newPass !== form.confirmPass) return showToast("error", "Passwords do not match.");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.newPass }),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to change password.");
      setForm({ newPass: "", confirmPass: "" });
      showToast("success", "Password changed successfully.");
    } catch (err) {
      showToast("error", getErrorMessage(err, "Failed to change password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-500" />
          Change Password
        </CardTitle>
        <CardDescription>Use a strong password with uppercase, numbers, and symbols.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 max-w-md">
        <div className="space-y-2">
          <Label>New password</Label>
          <div className="relative">
            <Input
              type={show.newPass ? "text" : "password"}
              value={form.newPass}
              placeholder="Min. 8 characters"
              onChange={(e) => setForm((p) => ({ ...p, newPass: e.target.value }))}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setShow((s) => ({ ...s, newPass: !s.newPass }))}
            >
              {show.newPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.newPass && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColor : "bg-slate-200"}`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500">{strengthLabel}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Confirm new password</Label>
          <div className="relative">
            <Input
              type={show.confirmPass ? "text" : "password"}
              value={form.confirmPass}
              placeholder="Repeat password"
              onChange={(e) => setForm((p) => ({ ...p, confirmPass: e.target.value }))}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setShow((s) => ({ ...s, confirmPass: !s.confirmPass }))}
            >
              {show.confirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.confirmPass && form.newPass !== form.confirmPass && (
            <p className="text-xs text-red-500">Passwords do not match.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Password requirements</p>
          {[
            ["At least 8 characters", form.newPass.length >= 8],
            ["At least one uppercase letter", /[A-Z]/.test(form.newPass)],
            ["At least one number", /[0-9]/.test(form.newPass)],
            ["At least one special character", /[^A-Za-z0-9]/.test(form.newPass)],
          ].map(([label, met]) => (
            <p key={label as string} className={`flex items-center gap-1.5 ${met ? "text-green-700" : ""}`}>
              {met ? <CheckCircle className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-slate-400" />}
              {label as string}
            </p>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !form.newPass || form.newPass !== form.confirmPass}
        >
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Update Password
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─────────────── PAYMENT ACCOUNTS TAB ─────────────── */
type AccountForm = Omit<PaymentAccount, "id" | "created_at" | "updated_at" | "created_by">;

function PaymentAccountsTab({ showToast }: { showToast: (t: "success" | "error", m: string) => void }) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<PaymentAccount | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyAccount());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/payment-accounts");
      const payload = await res.json() as { accounts?: PaymentAccount[]; error?: string };
      if (!res.ok) throw new Error(payload.error);
      setAccounts(payload.accounts ?? []);
    } catch {
      showToast("error", "Failed to load payment accounts.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...emptyAccount(), display_order: accounts.length });
    setShowForm(true);
  };

  const openEdit = (acc: PaymentAccount) => {
    setEditTarget(acc);
    setForm({
      method: acc.method,
      account_title: acc.account_title,
      account_number: acc.account_number,
      bank_name: acc.bank_name,
      iban: acc.iban,
      instructions: acc.instructions,
      is_active: acc.is_active,
      display_order: acc.display_order,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.account_title.trim() || !form.account_number.trim()) {
      showToast("error", "Account title and number are required.");
      return;
    }
    setSaving(true);
    try {
      const url = editTarget
        ? `/api/admin/settings/payment-accounts/${editTarget.id}`
        : "/api/admin/settings/payment-accounts";
      const res = await fetch(url, {
        method: editTarget ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to save.");
      await load();
      setShowForm(false);
      showToast("success", editTarget ? "Account updated." : "Account added.");
    } catch (err) {
      showToast("error", getErrorMessage(err, "Failed to save."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment account? Patients will no longer see it.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/settings/payment-accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete.");
      await load();
      showToast("success", "Account deleted.");
    } catch {
      showToast("error", "Failed to delete account.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (acc: PaymentAccount) => {
    try {
      const res = await fetch(`/api/admin/settings/payment-accounts/${acc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !acc.is_active }),
      });
      if (!res.ok) throw new Error("Failed to update.");
      await load();
    } catch {
      showToast("error", "Failed to update status.");
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const idx = accounts.findIndex((a) => a.id === id);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === accounts.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const next = [...accounts];
    const a = next[idx], b = next[swapIdx];
    [next[idx], next[swapIdx]] = [b, a];
    setAccounts(next);
    await Promise.all([
      fetch(`/api/admin/settings/payment-accounts/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: b.display_order }),
      }),
      fetch(`/api/admin/settings/payment-accounts/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: a.display_order }),
      }),
    ]);
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Payment Accounts</CardTitle>
              <CardDescription>
                These accounts are shown to patients when they need to send a manual payment (JazzCash, EasyPaisa, bank transfer).
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">No payment accounts yet</p>
              <p className="text-sm mt-1">Add accounts so patients know where to send payment.</p>
              <Button className="mt-4" size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Account
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {accounts.map((acc, idx) => {
                const Icon = getMethodIcon(acc.method);
                return (
                  <div key={acc.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2.5 rounded-lg ${acc.is_active ? "bg-brand-50" : "bg-slate-100"}`}>
                        <Icon className={`h-5 w-5 ${acc.is_active ? "text-brand-500" : "text-slate-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">{acc.account_title}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {methodLabel(acc.method)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${acc.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                            {acc.is_active ? "Active" : "Hidden"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5 font-mono">{acc.account_number}</p>
                        {acc.bank_name && <p className="text-xs text-slate-500">{acc.bank_name}</p>}
                        {acc.iban && <p className="text-xs text-slate-400">IBAN: {acc.iban}</p>}
                        {acc.instructions && (
                          <p className="text-xs text-slate-500 mt-1 italic">{acc.instructions}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => handleReorder(acc.id, "up")}
                        disabled={idx === 0}
                        className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleReorder(acc.id, "down")}
                        disabled={idx === accounts.length - 1}
                        className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(acc)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                        title={acc.is_active ? "Hide" : "Show"}
                      >
                        {acc.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => openEdit(acc)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        disabled={deletingId === acc.id}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === acc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex gap-3 text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <p>
          Active accounts are visible to patients on the payment screen when completing a booking. Hidden accounts are saved but not shown. Order them by dragging or using the arrows.
        </p>
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>{editTarget ? "Edit Payment Account" : "Add Payment Account"}</CardTitle>
              <CardDescription>This information will be shown to patients during payment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment method</Label>
                <select
                  value={form.method}
                  onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Account title / holder name</Label>
                <Input
                  placeholder="e.g. Stress Saviors Platform"
                  value={form.account_title}
                  onChange={(e) => setForm((p) => ({ ...p, account_title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Account number / phone number</Label>
                <Input
                  placeholder="e.g. 03001234567 or 1234-5678901-2"
                  value={form.account_number}
                  onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))}
                />
              </div>

              {["bank_transfer", "hbl", "ubl", "meezan", "allied", "mcb", "standard_chartered", "other"].includes(form.method) && (
                <>
                  <div className="space-y-2">
                    <Label>Bank name</Label>
                    <Input
                      placeholder="e.g. Habib Bank Limited"
                      value={form.bank_name ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value || null }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IBAN (optional)</Label>
                    <Input
                      placeholder="PK00 XXXX 0000 0000 0000 0000"
                      value={form.iban ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, iban: e.target.value || null }))}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Payment instructions (optional)</Label>
                <textarea
                  rows={3}
                  placeholder="e.g. Send payment and screenshot the confirmation. Include your appointment ID in the description."
                  value={form.instructions ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value || null }))}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="h-4 w-4 accent-brand-500"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700 cursor-pointer">
                  Show to patients (active)
                </label>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editTarget ? "Save Changes" : "Add Account"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─────────────── NOTIFICATIONS TAB ─────────────── */
function NotificationsTab({ showToast }: { showToast: (t: "success" | "error", m: string) => void }) {
  const supabase = createClient();
  const [prefs, setPrefs] = useState({
    new_appointment: true,
    payment_received: true,
    doctor_registered: true,
    patient_registered: true,
    appointment_cancelled: true,
    doctor_approval_pending: true,
  });
  const [saving, setSaving] = useState(false);

  const labels: Record<keyof typeof prefs, string> = {
    new_appointment: "New appointment booked",
    payment_received: "Payment received from patient",
    doctor_registered: "New doctor registration",
    patient_registered: "New patient registration",
    appointment_cancelled: "Appointment cancelled",
    doctor_approval_pending: "Doctor approval pending",
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.auth.updateUser({ data: { notification_prefs: prefs } });
      showToast("success", "Notification preferences saved.");
    } catch {
      showToast("error", "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-brand-500" />
          Notification Preferences
        </CardTitle>
        <CardDescription>Choose which platform events send you a notification.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-y divide-slate-100">
          {(Object.entries(labels) as [keyof typeof prefs, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between py-3 cursor-pointer group">
              <span className="text-sm text-slate-800 group-hover:text-slate-900">{label}</span>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                className="h-4 w-4 accent-brand-500"
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
