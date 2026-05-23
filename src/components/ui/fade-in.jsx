import { motion } from "motion/react";

export default function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  direction = "up", // up, down, left, right, none
  className = "",
  once = true,
  as = "div",
  ...props
}) {
  const directionOffset = {
    up: { y: 15, x: 0 },
    down: { y: -15, x: 0 },
    left: { x: 15, y: 0 },
    right: { x: -15, y: 0 },
    none: { x: 0, y: 0 },
  };

  const initial = { opacity: 0, ...directionOffset[direction] };
  const animate = { opacity: 1, x: 0, y: 0 };
  const Component = motion[as] || motion.div;

  return (
    <Component
      initial={initial}
      whileInView={animate}
      viewport={{ once, margin: "-20px" }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}
