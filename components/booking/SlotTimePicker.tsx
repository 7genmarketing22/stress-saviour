"use client";

import { Loader2 } from "lucide-react";
import {
  getSlotUiStatus,
  isSlotSelectable,
  type SlotUiStatus,
} from "@/lib/booking/slot-status";
import { formatSlotTime } from "@/lib/booking/slots";

interface SlotTimePickerProps {
  timeOptions: string[];
  bookedSlots: string[];
  blockedSlots: string[];
  selectedTime: string;
  onSelect: (time: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}

const STATUS_LABEL: Record<Exclude<SlotUiStatus, "available">, string> = {
  booked: "Booked",
  blocked: "Off",
};

export function SlotTimePicker({
  timeOptions,
  bookedSlots,
  blockedSlots,
  selectedTime,
  onSelect,
  loading = false,
  emptyMessage = "No bookable slots for this date. The doctor may not be available or has not configured working hours.",
}: SlotTimePickerProps) {
  if (loading) {
    return (
      <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking availability…
      </div>
    );
  }

  if (timeOptions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {timeOptions.map((time) => {
        const status = getSlotUiStatus(time, bookedSlots, blockedSlots);
        const selectable = isSlotSelectable(time, bookedSlots, blockedSlots);
        const isSelected = selectedTime === time;

        return (
          <button
            key={time}
            type="button"
            disabled={!selectable}
            onClick={() => selectable && onSelect(time)}
            title={
              status === "blocked"
                ? "Doctor unavailable"
                : status === "booked"
                  ? "Already booked"
                  : undefined
            }
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              status === "blocked"
                ? "cursor-not-allowed border-orange-100 bg-orange-50 text-orange-300 line-through"
                : status === "booked"
                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through"
                  : isSelected
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-slate-200 text-slate-700 hover:border-brand-200"
            }`}
          >
            {formatSlotTime(time)}
            {status !== "available" && (
              <span className="ml-1 text-[10px] normal-case no-underline">
                {STATUS_LABEL[status]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
