"use client";
import { motion } from "motion/react";

export function FadeIn({ children, delay = 0, y = 8, duration = 0.32, className, as: Component = "div" }) {
  const MotionComponent = motion[Component] || motion.div;
  return (
    <MotionComponent
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </MotionComponent>
  );
}
