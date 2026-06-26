"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { User, Mail, Phone, MapPin, Building, Activity, FileText,
  ShieldCheck, Lock, Bell, Clock, CreditCard,
  Check,
} from "lucide-react";
import { useDoctor } from "@/contexts/DoctorContext";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { uploadAndSetAvatar } from "@/lib/auth/profile";
import {
  updateDoctorDocuments,
  updateDoctorProfile,
  updatePassword,
  updateUserProfile,
} from "@/lib/doctor/api";

export default function DoctorProfilePage() {
  const { profile, doctorProfile, documents, setProfile, setDoctorProfile, setDocuments, refresh } =
    useDoctor();
  const [activeTab, setActiveTab] = useState<"profile" | "telehealth" | "payout" | "security">("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [profileForm, setProfileForm] = useState({
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone ?? "",
    specialization: doctorProfile.specialization,
    qualification: doctorProfile.qualification.join(", "),
    pmdcNumber: doctorProfile.pmdc_number,
    experience: String(doctorProfile.experience_years),
    city: profile.city ?? "",
    bio: doctorProfile.bio ?? "",
  });

  const [telehealth, setTelehealth] = useState({
    consultationFee: doctorProfile.consultation_fee,
    sessionDuration: documents.telehealth_settings?.sessionDuration ?? 30,
    enableVideo: documents.telehealth_settings?.enableVideo ?? true,
    enableAudio: documents.telehealth_settings?.enableAudio ?? true,
    enableChat: documents.telehealth_settings?.enableChat ?? false,
    autoApprove: documents.telehealth_settings?.autoApprove ?? true,
  });

  const [payout, setPayout] = useState({
    method: documents.payout_settings?.method ?? ("bank" as "bank" | "easypaisa" | "jazzcash"),
    bankName: documents.payout_settings?.bankName ?? "",
    iban: documents.payout_settings?.iban ?? "",
    walletNumber: documents.payout_settings?.walletNumber ?? "",
  });

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactor: false,
    emailAlerts: true,
    smsAlerts: false,
  });

  useEffect(() => {
    setProfileForm({
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone ?? "",
      specialization: doctorProfile.specialization,
      qualification: doctorProfile.qualification.join(", "),
      pmdcNumber: doctorProfile.pmdc_number,
      experience: String(doctorProfile.experience_years),
      city: profile.city ?? "",
      bio: doctorProfile.bio ?? "",
    });
    setTelehealth((prev) => ({
      ...prev,
      consultationFee: doctorProfile.consultation_fee,
      sessionDuration: documents.telehealth_settings?.sessionDuration ?? 30,
      enableVideo: documents.telehealth_settings?.enableVideo ?? true,
      enableAudio: documents.telehealth_settings?.enableAudio ?? true,
      enableChat: documents.telehealth_settings?.enableChat ?? false,
      autoApprove: documents.telehealth_settings?.autoApprove ?? true,
    }));
    if (documents.payout_settings) {
      setPayout(documents.payout_settings);
    }
  }, [profile, doctorProfile, documents]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleAvatarUpload = async (file: File) => {
    const updatedProfile = await uploadAndSetAvatar(profile.id, file);
    setProfile(updatedProfile);
    showToast("Profile photo updated.");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedProfile = await updateUserProfile(profile.id, {
        full_name: profileForm.fullName,
        phone: profileForm.phone || null,
        city: profileForm.city || null,
      });
      const updatedDoctor = await updateDoctorProfile(doctorProfile.id, {
        specialization: profileForm.specialization,
        qualification: profileForm.qualification.split(",").map((q) => q.trim()).filter(Boolean),
        pmdc_number: profileForm.pmdcNumber,
        experience_years: parseInt(profileForm.experience, 10) || doctorProfile.experience_years,
        bio: profileForm.bio || null,
      });
      setProfile(updatedProfile);
      setDoctorProfile(updatedDoctor);
      showToast("Profile credentials updated successfully.");
      await refresh();
    } catch {
      showToast("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTelehealth = async () => {
    setIsSaving(true);
    try {
      await updateDoctorProfile(doctorProfile.id, {
        consultation_fee: telehealth.consultationFee,
      });
      const result = await updateDoctorDocuments(doctorProfile.id, documents, {
        telehealth_settings: {
          sessionDuration: telehealth.sessionDuration,
          enableVideo: telehealth.enableVideo,
          enableAudio: telehealth.enableAudio,
          enableChat: telehealth.enableChat,
          autoApprove: telehealth.autoApprove,
        },
      });
      setDocuments(result.documents);
      setDoctorProfile(result.doctorProfile);
      showToast("Telehealth configuration saved.");
    } catch {
      showToast("Failed to save telehealth settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayout = async () => {
    setIsSaving(true);
    try {
      const result = await updateDoctorDocuments(doctorProfile.id, documents, {
        payout_settings: payout,
      });
      setDocuments(result.documents);
      showToast("Payout routing details updated.");
    } catch {
      showToast("Failed to save payout details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (security.newPassword && security.newPassword !== security.confirmPassword) {
      showToast("New passwords do not match!");
      return;
    }
    setIsSaving(true);
    try {
      if (security.newPassword) {
        await updatePassword(security.newPassword);
      }
      setSecurity({ ...security, currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Security settings updated successfully.");
    } catch {
      showToast("Failed to update security settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const commission = Math.round(telehealth.consultationFee * 0.1);
  const netEarnings = telehealth.consultationFee - commission;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium border border-slate-800 animate-in slide-in-from-right duration-200">
          <Check className="h-4 w-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Account & Practice Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your clinical availability, professional credentials, dynamic consultation fees, and payout routing.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12 items-start">
        {/* Navigation Sidebar */}
        <div className="md:col-span-3 space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-4 flex flex-col items-center text-center border-b border-border/60">
              <AvatarUpload
                name={profileForm.fullName}
                avatarUrl={profile.avatar_url}
                onUpload={handleAvatarUpload}
                onError={(msg) => showToast(msg)}
                size="lg"
                hint="JPG, PNG or WebP · max 2MB"
              />

              <div className="mt-3">
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="font-semibold text-base text-foreground leading-tight">{profileForm.fullName}</h3>
                  <ShieldCheck className="h-4 w-4 text-blue-500 fill-blue-500/10" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{profileForm.specialization}</p>
              </div>
            </CardContent>

            <div className="p-2 space-y-1">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === "profile"
                    ? "bg-teal-500/10 text-teal-700 dark:text-teal-400"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                <span>Profile Credentials</span>
              </button>
              <button
                onClick={() => setActiveTab("telehealth")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === "telehealth"
                    ? "bg-teal-500/10 text-teal-700 dark:text-teal-400"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Telehealth & Fees</span>
              </button>
              <button
                onClick={() => setActiveTab("payout")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === "payout"
                    ? "bg-teal-500/10 text-teal-700 dark:text-teal-400"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>Payout Methods</span>
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left ${
                  activeTab === "security"
                    ? "bg-teal-500/10 text-teal-700 dark:text-teal-400"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Lock className="h-4 w-4" />
                <span>Security & Alerts</span>
              </button>
            </div>
          </Card>
        </div>

        {/* Content Pane */}
        <div className="md:col-span-9">
          {/* TAB 1: Profile Info */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile}>
              <Card>
                <CardHeader>
                  <CardTitle>Professional Profile</CardTitle>
                  <CardDescription>
                    Configure your clinical details shown publicly to searching patients. PMDC changes trigger system audit.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                          required
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Email (Readonly) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="email"
                          value={profileForm.email}
                          disabled
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-muted/40 text-muted-foreground text-sm cursor-not-allowed"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Loaded from your login account (Supabase). Change it in account security or use a different login.
                      </p>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          required
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* City */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">City</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={profileForm.city}
                          onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                          required
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* PMDC Registration ID */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">PMDC Registration ID</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={profileForm.pmdcNumber}
                          onChange={(e) => setProfileForm({ ...profileForm, pmdcNumber: e.target.value })}
                          required
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Experience Years */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Years of Experience</label>
                      <div className="relative">
                        <Activity className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="number"
                          value={profileForm.experience}
                          onChange={(e) => setProfileForm({ ...profileForm, experience: e.target.value })}
                          required
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Specialization */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground">Primary Specialization</label>
                      <div className="relative">
                        <Activity className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={profileForm.specialization}
                          onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                          required
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Qualification */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground">Qualifications & Degrees</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={profileForm.qualification}
                          onChange={(e) => setProfileForm({ ...profileForm, qualification: e.target.value })}
                          required
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground">Professional Biography</label>
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        required
                        rows={4}
                        className="w-full p-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border/60 py-4 flex justify-end">
                  <Button type="submit" disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                    {isSaving ? "Saving Credentials..." : "Save Credentials"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          )}

          {/* TAB 2: Telehealth & Pricing */}
          {activeTab === "telehealth" && (
            <Card>
              <CardHeader>
                <CardTitle>Consultation Fee & Availability Settings</CardTitle>
                <CardDescription>
                  Configure booking prices, default consultation windows, and communication channels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Price Picker */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-foreground">Consultation Fee</label>
                    <span className="text-lg font-bold text-teal-600 dark:text-teal-400">PKR {telehealth.consultationFee.toLocaleString()}</span>
                  </div>
                  
                  <input
                    type="range"
                    min="1000"
                    max="5000"
                    step="500"
                    value={telehealth.consultationFee}
                    onChange={(e) => setTelehealth({ ...telehealth, consultationFee: parseInt(e.target.value) })}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border border-border/60 text-xs">
                    <div>
                      <p className="text-muted-foreground">Platform Commission (10%)</p>
                      <p className="font-semibold text-foreground mt-0.5">PKR {commission}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Payout per Session</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">PKR {netEarnings}</p>
                    </div>
                  </div>
                </div>

                {/* Duration Config */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Standard Session Duration</label>
                  <select
                    value={telehealth.sessionDuration}
                    onChange={(e) => setTelehealth({ ...telehealth, sessionDuration: parseInt(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  >
                    <option value={20}>20 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>

                {/* Allowed Communication Modes */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accepted Communication Channels</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors cursor-pointer select-none">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-teal-600" />
                        <div>
                          <p className="text-sm font-semibold">Video Consultations</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Highly recommended, high fidelity therapy</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={telehealth.enableVideo}
                        onChange={(e) => setTelehealth({ ...telehealth, enableVideo: e.target.checked })}
                        className="h-4.5 w-4.5 rounded border-border text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors cursor-pointer select-none">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-indigo-600" />
                        <div>
                          <p className="text-sm font-semibold">Voice Consultations</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Telephonic calls for low bandwidth sessions</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={telehealth.enableAudio}
                        onChange={(e) => setTelehealth({ ...telehealth, enableAudio: e.target.checked })}
                        className="h-4.5 w-4.5 rounded border-border text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors cursor-pointer select-none">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-slate-600" />
                        <div>
                          <p className="text-sm font-semibold">Text Counseling Chat</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Secure asynchronous typing sessions</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={telehealth.enableChat}
                        onChange={(e) => setTelehealth({ ...telehealth, enableChat: e.target.checked })}
                        className="h-4.5 w-4.5 rounded border-border text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Instant Bookings */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors cursor-pointer select-none">
                  <div>
                    <p className="text-sm font-semibold">Auto-Confirm Bookings</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Confirm new appointments immediately without review</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={telehealth.autoApprove}
                    onChange={(e) => setTelehealth({ ...telehealth, autoApprove: e.target.checked })}
                    className="h-4.5 w-4.5 rounded border-border text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </label>
              </CardContent>
              <CardFooter className="border-t border-border/60 py-4 flex justify-end">
                <Button onClick={handleSaveTelehealth} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                  {isSaving ? "Saving practice configuration..." : "Save Telehealth Config"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* TAB 3: Payout Settings */}
          {activeTab === "payout" && (
            <Card>
              <CardHeader>
                <CardTitle>Payout Methods & Invoicing</CardTitle>
                <CardDescription>
                  Choose how you want to receive your accumulated consultation fees. Disbursed semimonthly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayout({ ...payout, method: "bank" })}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
                      payout.method === "bank"
                        ? "border-teal-600 bg-teal-500/5 text-teal-700 dark:text-teal-400 font-semibold"
                        : "border-border hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Building className="h-5 w-5 mb-2" />
                    <span className="text-xs">Bank Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayout({ ...payout, method: "easypaisa" })}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
                      payout.method === "easypaisa"
                        ? "border-teal-600 bg-teal-500/5 text-teal-700 dark:text-teal-400 font-semibold"
                        : "border-border hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mb-2" />
                    <span className="text-xs">EasyPaisa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayout({ ...payout, method: "jazzcash" })}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
                      payout.method === "jazzcash"
                        ? "border-teal-600 bg-teal-500/5 text-teal-700 dark:text-teal-400 font-semibold"
                        : "border-border hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mb-2" />
                    <span className="text-xs">JazzCash</span>
                  </button>
                </div>

                {payout.method === "bank" ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Bank Name</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={payout.bankName}
                          onChange={(e) => setPayout({ ...payout, bankName: e.target.value })}
                          required
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">IBAN (International Bank Account Number)</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={payout.iban}
                          onChange={(e) => setPayout({ ...payout, iban: e.target.value })}
                          required
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-xs font-semibold text-muted-foreground">Mobile Wallet Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="tel"
                        placeholder="e.g. +92 300 1234567"
                        value={payout.walletNumber}
                        onChange={(e) => setPayout({ ...payout, walletNumber: e.target.value })}
                        required
                        className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/60 py-4 flex justify-end">
                <Button onClick={handleSavePayout} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                  {isSaving ? "Saving payout details..." : "Save Payout Method"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* TAB 4: Security & Alerts */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <form onSubmit={handleSaveSecurity}>
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Secure your therapist console profile. Use a strong password to guard patient data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Current Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Current Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="password"
                          value={security.currentPassword}
                          onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                          required
                          placeholder="••••••••"
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="password"
                          value={security.newPassword}
                          onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                          required
                          placeholder="••••••••"
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                          type="password"
                          value={security.confirmPassword}
                          onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                          required
                          placeholder="••••••••"
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/60 py-4 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                      {isSaving ? "Updating password..." : "Change Password"}
                    </Button>
                  </CardFooter>
                </Card>
              </form>

              {/* Notification Toggles */}
              <Card>
                <CardHeader>
                  <CardTitle>Security Notifications & Preferences</CardTitle>
                  <CardDescription>Configure alerts for new appointments and security logins.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Two-Factor Toggle */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors cursor-pointer select-none">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-teal-600" />
                      <div>
                        <p className="text-sm font-semibold">Enable Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Require an OTP code from an authenticator app at login</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={security.twoFactor}
                      onChange={(e) => setSecurity({ ...security, twoFactor: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-border text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </label>

                  {/* Email Notifications */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors cursor-pointer select-none">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-teal-600" />
                      <div>
                        <p className="text-sm font-semibold">Email Alerts</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Receive appointment confirmations and billing summaries via email</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={security.emailAlerts}
                      onChange={(e) => setSecurity({ ...security, emailAlerts: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-border text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </label>

                  {/* SMS Notifications */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors cursor-pointer select-none">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-teal-600" />
                      <div>
                        <p className="text-sm font-semibold">SMS Alerts</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Receive immediate SMS texts when a patient joins the video consult room</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={security.smsAlerts}
                      onChange={(e) => setSecurity({ ...security, smsAlerts: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-border text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </label>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
