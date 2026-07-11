"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Plus, Trash, Check, Save, Clock, X, Calendar,
  Power, Settings, RefreshCw, Ban, AlertCircle, Loader2,
} from "lucide-react";
import { useDoctor } from "@/contexts/DoctorContext";
import {
  getAvailabilitySlots,
  saveAvailabilitySlots,
  slotsToWeeklySchedule,
  updateDoctorDocuments,
  getDocBlockedSlots,
  addDocBlockedSlot,
  removeDocBlockedSlot,
  type DoctorBlockedSlot,
} from "@/lib/doctor/api";

interface DaySchedule {
  day: string;
  slots: string[];
  isActive: boolean;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string;
}

export default function DoctorSchedulePage() {
  const { doctorProfile, documents, setDocuments } = useDoctor();
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day: "Monday", slots: [], isActive: false },
    { day: "Tuesday", slots: [], isActive: false },
    { day: "Wednesday", slots: [], isActive: false },
    { day: "Thursday", slots: [], isActive: false },
    { day: "Friday", slots: [], isActive: false },
    { day: "Saturday", slots: [], isActive: false },
    { day: "Sunday", slots: [], isActive: false },
  ]);

  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(documents.blocked_dates ?? []);

  const [configs, setConfigs] = useState({
    bufferTime: documents.schedule_config?.bufferTime ?? 5,
    bookingNotice: documents.schedule_config?.bookingNotice ?? 2,
    maxPatients: documents.schedule_config?.maxPatients ?? 10,
  });

  const [toastMessage, setToastMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [addingSlotTo, setAddingSlotTo] = useState<number | null>(null);
  const [newSlotStart, setNewSlotStart] = useState("17:00");
  const [newSlotEnd, setNewSlotEnd] = useState("17:30");

  // Legacy full-day block (JSONB-based — kept for backward compatibility)
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false);

  // New granular blocked slots (database-backed)
  const [blockedSlots, setBlockedSlots] = useState<DoctorBlockedSlot[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [showSlotBlockForm, setShowSlotBlockForm] = useState(false);
  const [slotBlockDate, setSlotBlockDate] = useState("");
  const [slotBlockStart, setSlotBlockStart] = useState("");
  const [slotBlockEnd, setSlotBlockEnd] = useState("");
  const [slotBlockReason, setSlotBlockReason] = useState("Personal leave");
  const [savingSlotBlock, setSavingSlotBlock] = useState(false);
  const [removingSlotId, setRemovingSlotId] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const slots = await getAvailabilitySlots(doctorProfile.id);
      setSchedule(slotsToWeeklySchedule(slots));
      if (documents.blocked_dates) setBlockedDates(documents.blocked_dates);
      if (documents.schedule_config) setConfigs(documents.schedule_config);
    } catch {
      showToast("Failed to load schedule.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadBlockedSlots = async () => {
    setLoadingBlocked(true);
    try {
      const data = await getDocBlockedSlots(doctorProfile.id);
      setBlockedSlots(data);
    } catch {
      // Non-critical, fail silently
    } finally {
      setLoadingBlocked(false);
    }
  };

  useEffect(() => {
    loadSchedule();
    loadBlockedSlots();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorProfile.id]);

  const toggleDay = (index: number) => {
    const updated = [...schedule];
    updated[index].isActive = !updated[index].isActive;
    if (!updated[index].isActive) {
      updated[index].slots = [];
    } else if (updated[index].slots.length === 0) {
      updated[index].slots = ["05:00 PM - 05:30 PM"];
    }
    setSchedule(updated);
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    const updated = [...schedule];
    updated[dayIndex].slots.splice(slotIndex, 1);
    if (updated[dayIndex].slots.length === 0) {
      updated[dayIndex].isActive = false;
    }
    setSchedule(updated);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const addSlot = (dayIndex: number) => {
    const formattedStart = formatTime(newSlotStart);
    const formattedEnd = formatTime(newSlotEnd);
    const slotString = `${formattedStart} - ${formattedEnd}`;

    const updated = [...schedule];
    if (!updated[dayIndex].isActive) {
      updated[dayIndex].isActive = true;
    }
    // Prevent duplicate slot additions
    if (updated[dayIndex].slots.includes(slotString)) {
      showToast("This slot already exists.");
      return;
    }
    updated[dayIndex].slots.push(slotString);
    updated[dayIndex].slots.sort();
    setSchedule(updated);
    setAddingSlotTo(null);
    showToast(`Added slot for ${updated[dayIndex].day}.`);
  };

  // Preset Handlers
  const applyPreset = (presetName: "evening" | "fullday" | "weekends") => {
    let updated: DaySchedule[] = [];
    if (presetName === "evening") {
      updated = schedule.map(sch => {
        const isWeekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(sch.day);
        return {
          day: sch.day,
          isActive: isWeekday,
          slots: isWeekday ? ["05:00 PM - 05:30 PM", "05:30 PM - 06:00 PM", "06:00 PM - 06:30 PM", "06:30 PM - 07:00 PM"] : []
        };
      });
      showToast("Evening Only preset applied.");
    } else if (presetName === "fullday") {
      updated = schedule.map(sch => {
        const isWeekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(sch.day);
        return {
          day: sch.day,
          isActive: isWeekday,
          slots: isWeekday ? [
            "09:00 AM - 09:30 AM", "09:30 AM - 10:00 AM", "10:00 AM - 10:30 AM",
            "02:00 PM - 02:30 PM", "02:30 PM - 03:00 PM", "03:00 PM - 03:30 PM"
          ] : []
        };
      });
      showToast("Full Day (Weekday) preset applied.");
    } else if (presetName === "weekends") {
      updated = schedule.map(sch => {
        const isWeekend = ["Saturday", "Sunday"].includes(sch.day);
        return {
          day: sch.day,
          isActive: isWeekend,
          slots: isWeekend ? ["10:00 AM - 10:30 AM", "10:30 AM - 11:00 AM", "11:00 AM - 11:30 AM"] : []
        };
      });
      showToast("Weekends Only preset applied.");
    }
    setSchedule(updated);
  };

  // ── Granular blocked slot handlers ─────────────────────────────

  const handleAddBlockedSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotBlockDate) return;
    setSavingSlotBlock(true);
    try {
      await addDocBlockedSlot(
        doctorProfile.id,
        slotBlockDate,
        slotBlockReason || "Unavailable",
        slotBlockStart || undefined,
        slotBlockEnd || undefined,
      );
      await loadBlockedSlots();
      setSlotBlockDate("");
      setSlotBlockStart("");
      setSlotBlockEnd("");
      setSlotBlockReason("Personal leave");
      setShowSlotBlockForm(false);
      showToast("Slot blocked — patients cannot book this time.");
    } catch {
      showToast("Failed to block slot.");
    } finally {
      setSavingSlotBlock(false);
    }
  };

  const handleRemoveBlockedSlot = async (id: string) => {
    setRemovingSlotId(id);
    try {
      await removeDocBlockedSlot(id);
      setBlockedSlots((prev) => prev.filter((s) => s.id !== id));
      showToast("Slot unblocked — patients can book this time again.");
    } catch {
      showToast("Failed to unblock slot.");
    } finally {
      setRemovingSlotId(null);
    }
  };

  // ── Legacy full-day block (JSONB) ───────────────────────────────

  // Add Override Block Date
  const handleAddBlockDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockDate) return;
    const newBlock: BlockedDate = {
      id: `bl-${Date.now()}`,
      date: newBlockDate,
      reason: newBlockReason || "Personal Leave",
    };
    const updated = [...blockedDates, newBlock];
    try {
      const result = await updateDoctorDocuments(doctorProfile.id, documents, {
        blocked_dates: updated,
      });
      setDocuments(result.documents);
      setBlockedDates(updated);
      setNewBlockDate("");
      setNewBlockReason("");
      setShowBlockForm(false);
      showToast("Blocked date override saved.");
    } catch {
      showToast("Failed to save blocked date.");
    }
  };

  const removeBlockDate = async (id: string) => {
    const updated = blockedDates.filter((b) => b.id !== id);
    try {
      const result = await updateDoctorDocuments(doctorProfile.id, documents, {
        blocked_dates: updated,
      });
      setDocuments(result.documents);
      setBlockedDates(updated);
      showToast("Blocked date restriction removed.");
    } catch {
      showToast("Failed to remove blocked date.");
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await saveAvailabilitySlots(doctorProfile.id, schedule, 30);
      const result = await updateDoctorDocuments(doctorProfile.id, documents, {
        schedule_config: configs,
      });
      setDocuments(result.documents);
      showToast("Active weekly planner changes saved.");
      await loadSchedule();
    } catch {
      showToast("Failed to save schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium border border-slate-800 animate-in slide-in-from-right duration-200">
          <Check className="h-4 w-4 text-brand-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Description */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Availability Planner</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your standard weekly telemedicine slots, block off leaves/holidays, and tune booking constraints.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Side: Weekly Day Editor */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border/60">
            <h3 className="font-semibold text-sm">Weekly Active Hours</h3>
            <span className="text-xs text-muted-foreground">Toggle active status for specific days</span>
          </div>

          {schedule.map((sch, dayIndex) => (
            <Card key={sch.day} className={`overflow-hidden transition-all duration-200 ${!sch.isActive ? "opacity-70 bg-muted/20 border-dashed" : "border-border hover:shadow-sm"}`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => toggleDay(dayIndex)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border cursor-pointer transition-all ${
                        sch.isActive
                          ? "bg-brand-500 border-brand-500 text-white shadow-sm"
                          : "border-border hover:border-foreground text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{sch.day}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sch.isActive ? `${sch.slots.length} slots active` : "Unavailable"}
                      </p>
                    </div>
                  </div>

                  {sch.isActive && (
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {sch.slots.map((slot, slotIndex) => (
                          <span
                            key={slotIndex}
                            className="inline-flex items-center gap-1 bg-brand-400/10 text-brand-600 dark:text-brand-300 text-xs font-semibold px-2.5 py-1 rounded-md border border-brand-400/20"
                          >
                            <Clock className="h-3 w-3" />
                            {slot}
                            <button
                              onClick={() => removeSlot(dayIndex, slotIndex)}
                              className="hover:text-destructive shrink-0 cursor-pointer ml-1"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}

                        {addingSlotTo === dayIndex ? (
                          <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border animate-in fade-in duration-200">
                            <input
                              type="time"
                              value={newSlotStart}
                              onChange={(e) => setNewSlotStart(e.target.value)}
                              className="h-8 rounded border border-border px-2 text-xs bg-card"
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <input
                              type="time"
                              value={newSlotEnd}
                              onChange={(e) => setNewSlotEnd(e.target.value)}
                              className="h-8 rounded border border-border px-2 text-xs bg-card"
                            />
                            <Button
                              size="sm"
                              className="h-8 px-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
                              onClick={() => addSlot(dayIndex)}
                            >
                              Add
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setAddingSlotTo(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-dashed"
                            onClick={() => setAddingSlotTo(dayIndex)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            <span>Add Slot</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right Side: Constraints & Off-dates */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Presets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Quick Presets</CardTitle>
              <CardDescription>Instantly update active slot configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs font-semibold gap-2" onClick={() => applyPreset("evening")}>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Evening Shift (5:00 - 7:00 PM)</span>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs font-semibold gap-2" onClick={() => applyPreset("fullday")}>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Full Shift (9:00 AM - 3:30 PM)</span>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs font-semibold gap-2" onClick={() => applyPreset("weekends")}>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Weekends Only (Sat - Sun)</span>
              </Button>
            </CardContent>
          </Card>

          {/* Rules & Parameters */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-brand-500" />
                <CardTitle className="text-sm font-bold">Constraints</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buffer Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Session Buffer Time</label>
                <select
                  value={configs.bufferTime}
                  onChange={(e) => setConfigs({ ...configs, bufferTime: parseInt(e.target.value) })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-brand-400/20 focus:border-brand-400"
                >
                  <option value={0}>No Buffer</option>
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                </select>
              </div>

              {/* Booking Notice Period */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Minimum Booking Notice</label>
                <select
                  value={configs.bookingNotice}
                  onChange={(e) => setConfigs({ ...configs, bookingNotice: parseInt(e.target.value) })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-brand-400/20 focus:border-brand-400"
                >
                  <option value={1}>1 Hour in advance</option>
                  <option value={2}>2 Hours in advance</option>
                  <option value={6}>6 Hours in advance</option>
                  <option value={12}>12 Hours in advance</option>
                  <option value={24}>24 Hours in advance</option>
                </select>
              </div>

              {/* Max daily patient capacity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex justify-between">
                  <span>Max Daily Capacity</span>
                  <span className="font-bold text-brand-500">{configs.maxPatients} Patients</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="20"
                  step="1"
                  value={configs.maxPatients}
                  onChange={(e) => setConfigs({ ...configs, maxPatients: parseInt(e.target.value) })}
                  className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Block-out Holiday Dates */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div>
                <CardTitle className="text-sm font-bold">Holiday Block-outs</CardTitle>
                <CardDescription className="text-[10px]">Override standard availability for specific dates</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-brand-500" onClick={() => setShowBlockForm(!showBlockForm)}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showBlockForm && (
                <form onSubmit={handleAddBlockDate} className="space-y-3 p-3 rounded-lg border border-border bg-muted/20 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Select Date</label>
                    <input
                      type="date"
                      required
                      value={newBlockDate}
                      onChange={(e) => setNewBlockDate(e.target.value)}
                      className="w-full h-8 px-2 rounded border border-border text-xs bg-card"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Attending conference"
                      value={newBlockReason}
                      onChange={(e) => setNewBlockReason(e.target.value)}
                      className="w-full h-8 px-2 rounded border border-border text-xs bg-card"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold h-7 text-xs">
                      Block Date
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowBlockForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {blockedDates.length > 0 ? (
                  blockedDates.map((block) => (
                    <div key={block.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-card text-xs hover:border-red-200 transition-colors group">
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{new Date(block.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{block.reason}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBlockDate(block.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-4 border border-dashed rounded-lg">No holidays blocked yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Granular Slot Block-outs */}
          <Card className="border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div>
                <div className="flex items-center gap-1.5">
                  <Ban className="h-4 w-4 text-orange-500" />
                  <CardTitle className="text-sm font-bold">Mark Slots as Off</CardTitle>
                </div>
                <CardDescription className="text-[10px] mt-0.5">
                  Block specific time slots or full days — patients cannot book these
                </CardDescription>
              </div>
              <Button
                variant="ghost" size="sm"
                className="h-8 w-8 p-0 text-orange-500"
                onClick={() => setShowSlotBlockForm(!showSlotBlockForm)}
              >
                {showSlotBlockForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {showSlotBlockForm && (
                <form onSubmit={handleAddBlockedSlot} className="space-y-3 p-3 rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Date *</label>
                    <input
                      type="date"
                      required
                      value={slotBlockDate}
                      onChange={(e) => setSlotBlockDate(e.target.value)}
                      className="w-full h-8 px-2 rounded border border-border text-xs bg-card"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground">From (optional)</label>
                      <input
                        type="time"
                        value={slotBlockStart}
                        onChange={(e) => setSlotBlockStart(e.target.value)}
                        className="w-full h-8 px-2 rounded border border-border text-xs bg-card"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground">To (optional)</label>
                      <input
                        type="time"
                        value={slotBlockEnd}
                        onChange={(e) => setSlotBlockEnd(e.target.value)}
                        className="w-full h-8 px-2 rounded border border-border text-xs bg-card"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Leave time blank to block the entire day.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Personal leave, Conference, Break"
                      value={slotBlockReason}
                      onChange={(e) => setSlotBlockReason(e.target.value)}
                      className="w-full h-8 px-2 rounded border border-border text-xs bg-card"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingSlotBlock}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold h-7 text-xs"
                    >
                      {savingSlotBlock ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Block Slot"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowSlotBlockForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {loadingBlocked ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : blockedSlots.length > 0 ? (
                <div className="space-y-2">
                  {blockedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-orange-200 bg-orange-50/60 dark:bg-orange-950/10 text-xs group hover:border-orange-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Ban className="h-3.5 w-3.5 text-orange-500" />
                          <span>
                            {new Date(slot.blocked_date + "T12:00:00").toLocaleDateString("en-US", {
                              weekday: "short", year: "numeric", month: "short", day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">
                          {slot.start_time && slot.end_time
                            ? `${slot.start_time} – ${slot.end_time}`
                            : slot.start_time
                              ? `From ${slot.start_time}`
                              : "Full day"}
                          {" · "}
                          {slot.reason}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={removingSlotId === slot.id}
                        onClick={() => handleRemoveBlockedSlot(slot.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer disabled:opacity-50"
                      >
                        {removingSlotId === slot.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-5 border border-dashed border-orange-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-300" />
                  <p className="text-[10px] text-muted-foreground">No slots blocked. Add blocks above to mark unavailability.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="pt-2">
            <Button onClick={handleSaveAll} disabled={isSaving} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-5 gap-2 shadow-md">
              <Save className="h-4.5 w-4.5" />
              <span>{isSaving ? "Saving Planner changes..." : "Save Active Planner"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
