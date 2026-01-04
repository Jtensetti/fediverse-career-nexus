import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Check, Globe } from "lucide-react";

type StatusType = "online" | "verified" | "admin" | "remote" | "none";
type SizeType = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface AvatarWithStatusProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  status?: StatusType;
  size?: SizeType;
  className?: string;
  ringClassName?: string;
}

const sizeClasses: Record<SizeType, { avatar: string; ring: string; badge: string; icon: string }> = {
  xs: { avatar: "h-6 w-6", ring: "ring-1", badge: "h-3 w-3 -bottom-0.5 -right-0.5", icon: "h-2 w-2" },
  sm: { avatar: "h-8 w-8", ring: "ring-2", badge: "h-4 w-4 -bottom-0.5 -right-0.5", icon: "h-2.5 w-2.5" },
  md: { avatar: "h-10 w-10", ring: "ring-2", badge: "h-5 w-5 -bottom-1 -right-1", icon: "h-3 w-3" },
  lg: { avatar: "h-14 w-14", ring: "ring-[3px]", badge: "h-6 w-6 -bottom-1 -right-1", icon: "h-3.5 w-3.5" },
  xl: { avatar: "h-20 w-20", ring: "ring-4", badge: "h-7 w-7 -bottom-1 -right-1", icon: "h-4 w-4" },
  "2xl": { avatar: "h-32 w-32 md:h-36 md:w-36", ring: "ring-4", badge: "h-8 w-8 -bottom-1 -right-1", icon: "h-5 w-5" },
};

const statusColors: Record<StatusType, string> = {
  online: "ring-green-500",
  verified: "ring-primary",
  admin: "ring-amber-500",
  remote: "ring-purple-500",
  none: "ring-transparent",
};

const badgeColors: Record<StatusType, string> = {
  online: "bg-green-500",
  verified: "bg-primary",
  admin: "bg-amber-500",
  remote: "bg-purple-500",
  none: "",
};

const AvatarWithStatus = ({
  src,
  alt = "User",
  fallback,
  status = "none",
  size = "md",
  className,
  ringClassName,
}: AvatarWithStatusProps) => {
  const sizes = sizeClasses[size];
  const displayFallback = fallback || alt?.charAt(0).toUpperCase() || "U";

  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar
        className={cn(
          sizes.avatar,
          sizes.ring,
          "ring-offset-2 ring-offset-background transition-all duration-200",
          statusColors[status],
          ringClassName
        )}
      >
        <AvatarImage src={src || undefined} alt={alt} className="object-cover" />
        <AvatarFallback className="text-sm font-medium bg-muted">
          {displayFallback}
        </AvatarFallback>
      </Avatar>

      {/* Status Badge */}
      {status !== "none" && (
        <div
          className={cn(
            "absolute rounded-full flex items-center justify-center border-2 border-background",
            sizes.badge,
            badgeColors[status]
          )}
        >
          {status === "verified" && <Check className={cn(sizes.icon, "text-primary-foreground")} />}
          {status === "remote" && <Globe className={cn(sizes.icon, "text-white")} />}
          {status === "admin" && <span className={cn(sizes.icon, "text-white font-bold text-[8px]")}>★</span>}
        </div>
      )}
    </div>
  );
};

export default AvatarWithStatus;
