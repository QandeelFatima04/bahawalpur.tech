"use client";
import { motion } from "motion/react";

const containerVariants = (staggerChildren, delayChildren) => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
};

export function StaggerChildren({
  children,
  stagger = 0.06,
  delay = 0.02,
  className,
}) {
  return (
    <motion.div
      variants={containerVariants(stagger, delay)}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, as: Component = "div" }) {
  const MotionComponent = motion[Component] || motion.div;
  return (
    <MotionComponent variants={itemVariants} className={className}>
      {children}
    </MotionComponent>
  );
}
