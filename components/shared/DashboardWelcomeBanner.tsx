"use client";

import type { ReactNode } from "react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";

interface DashboardWelcomeBannerProps {
  name: string;
  avatarUrl?: string | null;
  badge: ReactNode;
  title: string;
  description: string;
  decoration?: ReactNode;
  className?: string;
  /** Extra row under the description (e.g. doctor online status). */
  meta?: ReactNode;
}

/**
 * Compact welcome hero for dashboards.
 * Mobile: small avatar + tight copy. Desktop: larger avatar + roomier spacing.
 */
export function DashboardWelcomeBanner({
  name,
  avatarUrl,
  badge,
  title,
  description,
  decoration,
  className,
  meta,
}: DashboardWelcomeBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 text-white shadow-md",
        "p-4 sm:p-6 md:p-8",
        className
      )}
    >
      <div className="relative z-10 flex items-start gap-3 sm:gap-4 md:gap-5">
        <UserAvatar
          name={name}
          avatarUrl={avatarUrl}
          size="md"
          ring
          className="h-11 w-11 text-sm border-white/30 bg-white/10 text-white ring-white/70 sm:h-14 sm:w-14 sm:text-lg md:h-16 md:w-16 md:text-xl"
        />

        <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {badge}
            {meta}
          </div>

          <h2 className="text-lg font-bold leading-snug tracking-tight sm:text-2xl md:text-3xl">
            {title}
          </h2>

          <p className="max-w-2xl text-xs leading-relaxed text-white/90 sm:text-sm md:text-base">
            {description}
          </p>
        </div>
      </div>

      {decoration ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/4 items-center justify-center opacity-15 sm:flex lg:w-1/3 lg:opacity-20">
          {decoration}
        </div>
      ) : null}
    </div>
  );
}
