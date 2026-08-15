import React from "react";
import { cn } from "@/lib/utils";

const GlassCard = ({
  children,
  className = "",
  hover = true,
  glow = "none",
  ...props
}) => {
  const glowStyles = {
    primary: "hover:glow-primary",
    secondary: "hover:glow-secondary",
    warning: "hover:glow-warning",
    success: "hover:glow-success",
    none: "",
  };

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 transition-all duration-300",
        hover && "hover:-translate-y-1",
        glowStyles[glow],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
