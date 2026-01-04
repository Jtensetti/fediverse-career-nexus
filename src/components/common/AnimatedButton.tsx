"use client";

import { ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface AnimatedButtonProps {
  children: ReactNode;
  className?: string;
  scale?: number;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const AnimatedButton = ({ 
  children, 
  className, 
  scale = 1.02, 
  onClick,
  disabled,
  type = "button"
}: AnimatedButtonProps) => {
  return (
    <motion.button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : scale }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
};

export default AnimatedButton;
