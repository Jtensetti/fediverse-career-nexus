import { cn } from "@/lib/utils";

interface FreelancerBadgeProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-22 h-22",
  "2xl": "w-36 h-36 md:w-40 md:h-40",
};

/**
 * Freelancer badge ring that wraps around an avatar to indicate 
 * the user is "Open for Work" - similar to LinkedIn's green ring
 */
const FreelancerBadge = ({ size = "md", className }: FreelancerBadgeProps) => {
  return (
    <div
      className={cn(
        "absolute inset-0 rounded-full pointer-events-none",
        "ring-[3px] ring-green-500",
        "before:absolute before:inset-0 before:rounded-full",
        "before:bg-gradient-to-br before:from-green-400 before:to-green-600",
        "before:opacity-20",
        sizeClasses[size],
        className
      )}
      aria-label="Open for work"
    />
  );
};

export default FreelancerBadge;
