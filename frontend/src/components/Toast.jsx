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
      bg: "bg-background",
      border: "border-destructive/50",
      text: "text-foreground",
      glow: "shadow-[0_18px_50px_rgba(0,0,0,0.85)]",
    },
    success: {
      icon: CheckCircle,
      bg: "bg-background",
      border: "border-success/50",
      text: "text-foreground",
      glow: "shadow-[0_18px_50px_rgba(0,0,0,0.85)]",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-background",
      border: "border-primary/50",
      text: "text-foreground",
      glow: "shadow-[0_18px_50px_rgba(0,0,0,0.85)]",
    },
    info: {
      icon: Info,
      bg: "bg-background",
      border: "border-primary/50",
      text: "text-foreground",
      glow: "shadow-[0_18px_50px_rgba(0,0,0,0.85)]",
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
          border rounded-md p-4
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
          className="p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
