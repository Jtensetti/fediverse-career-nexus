"use client";

import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  hoverY?: number;
}

const AnimatedCard = ({ 
  children, 
  className = "", 
  hoverScale = 1.02,
  hoverY = -4
}: AnimatedCardProps) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ 
        scale: hoverScale, 
        y: hoverY,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;
