
import React from "react";
import { Badge } from "@/components/ui/badge";
import { UsersRound } from "lucide-react";

type ConnectionDegree = 1 | 2 | 3 | null;

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
    1: "bg-blue-100 text-blue-800 border-blue-200",
    2: "bg-green-100 text-green-800 border-green-200",
    3: "bg-gray-100 text-gray-800 border-gray-200"
  };
  
  const degreeText = {
    1: "1st",
    2: "2nd",
    3: "3rd"
  };
  
  return (
    <Badge 
      variant="outline" 
      className={`${badgeStyles[degree]} ${sizeClasses} flex items-center gap-1 font-medium ${className}`}
    >
      {showIcon && <UsersRound size={size === "sm" ? 12 : 14} />}
      {degreeText[degree]}
    </Badge>
  );
};

export default ConnectionBadge;
