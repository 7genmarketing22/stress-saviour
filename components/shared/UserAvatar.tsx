import Image from "next/image";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/doctor/mappers";

const sizeMap = {
  xs: "h-8 w-8 text-xs",
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-16 w-16 text-xl",
  xl: "h-20 w-20 text-2xl",
} as const;

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
  ring?: boolean;
}

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  ring = false,
}: UserAvatarProps) {
  const initials = getInitials(name);
  const sizeClass = sizeMap[size];
  const isDataUrl = avatarUrl?.startsWith("data:");

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20",
        sizeClass,
        ring && "ring-2 ring-white/80 ring-offset-2 ring-offset-transparent",
        className
      )}
    >
      {avatarUrl ? (
        isDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Image
            src={avatarUrl}
            alt={name}
            fill
            className="object-cover"
            sizes={
              size === "xl"
                ? "80px"
                : size === "lg"
                  ? "64px"
                  : size === "md"
                    ? "48px"
                    : "40px"
            }
            unoptimized
          />
        )
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
