import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  X,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react";

const Toast = ({
  message,
  type = "error", // 'error' | 'success' | 'warning' | 'info'
  duration = 5000,
  onClose,
}) => {
  const [visible, setVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!message) return;

    setVisible(true);
    setIsExiting(false);

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 300);
  };

  if (!visible || !message) return null;

  const config = {
    error: {
      icon: AlertCircle,
      bg: "bg-destructive/90",
      border: "border-destructive",
      text: "text-destructive-foreground",
      glow: "shadow-[0_0_20px_hsl(0,70%,50%,0.3)]",
    },
    success: {
      icon: CheckCircle,
      bg: "bg-[hsl(142,76%,36%)]/90",
      border: "border-[hsl(142,76%,36%)]",
      text: "text-[hsl(210,20%,98%)]",
      glow: "shadow-[0_0_20px_hsl(142,76%,36%,0.3)]",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-[hsl(45,100%,51%)]/90",
      border: "border-[hsl(45,100%,51%)]",
      text: "text-[hsl(220,20%,4%)]",
      glow: "shadow-[0_0_20px_hsl(45,100%,51%,0.3)]",
    },
    info: {
      icon: Info,
      bg: "bg-[hsl(185,85%,50%)]/90",
      border: "border-[hsl(185,85%,50%)]",
      text: "text-[hsl(220,20%,4%)]",
      glow: "shadow-[0_0_20px_hsl(185,85%,50%,0.3)]",
    },
  };

  const { icon: Icon, bg, border, text, glow } =
    config[type] || config.error;

  return (
    <div
      className={`fixed top-6 right-6 z-50 ${
        isExiting
          ? "animate-slide-out-right"
          : "animate-slide-in-right"
      }`}
      style={{ maxWidth: "400px" }}
    >
      <div
        className={`
          ${bg} ${border} ${text} ${glow}
          backdrop-blur-xl border rounded-xl p-4
          flex items-start gap-3
          transition-all duration-300
        `}
      >
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />

        <p className="flex-1 text-sm font-medium leading-relaxed">
          {message}
        </p>

        <button
          onClick={handleClose}
          className="p-1 rounded-lg hover:bg-black/20 transition active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
