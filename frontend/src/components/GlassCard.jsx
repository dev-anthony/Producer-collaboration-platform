import React from "react";

const GlassCard = ({ children, className = "", hover = true, glow = "none", ...props }) => {
  const glowStyles = {
    purple: "hover:shadow-[0_0_30px_hsl(270_95%_65%/0.3)]",
    cyan: "hover:shadow-[0_0_30px_hsl(180_100%_50%/0.3)]",
    none: "",
  };

  const hoverClass = hover ? "hover:-translate-y-1" : "";

  return (
    <div
      className={`glass rounded-2xl p-6 transition-all duration-300 ${hoverClass} ${glowStyles[glow]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;