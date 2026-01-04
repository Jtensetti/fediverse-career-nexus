import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FocusRingProps {
  children: ReactNode;
  className?: string;
}

export function FocusRing({ children, className }: FocusRingProps) {
  return (
    <div
      className={cn(
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 rounded-md",
        className
      )}
    >
      {children}
    </div>
  );
}

export default FocusRing;
