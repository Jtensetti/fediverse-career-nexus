
import React from "react";
import { Badge } from "@/components/ui/badge";
import { UsersRound } from "lucide-react";

export type ConnectionDegree = 1 | 2 | 3 | null;

interface ConnectionBadgeProps {
  degree: ConnectionDegree;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const ConnectionBadge = ({ 
  degree, 
  className = "", 
  showIcon = true,
  size = "md" 
}: ConnectionBadgeProps) => {
  if (!degree || degree > 3) return null;
  
  const sizeClasses = size === "sm" ? "text-xs py-0 px-1.5" : "text-xs py-0.5 px-2";
  
  const badgeStyles = {
    1: "bg-primary/10 text-primary border-primary/30",
    2: "bg-secondary/10 text-secondary-foreground border-secondary/30",
    3: "bg-muted text-muted-foreground border-muted-foreground/30"
  };
  
  const degreeText = {
    1: "1st",
    2: "2nd",
    3: "3rd"
  };
  
  return (
    <Badge 
      variant="outline" 
      className={`${badgeStyles[degree as 1 | 2 | 3]} ${sizeClasses} flex items-center gap-1 font-medium ${className}`}
    >
      {showIcon && <UsersRound size={size === "sm" ? 12 : 14} />}
      {degreeText[degree as 1 | 2 | 3]}
    </Badge>
  );
};

export default ConnectionBadge;
