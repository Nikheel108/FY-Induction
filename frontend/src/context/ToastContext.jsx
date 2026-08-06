import { createContext, useCallback, useContext, useRef, useState } from "react";
import { FaCheckCircle, FaInfoCircle, FaExclamationTriangle } from "react-icons/fa";

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: FaCheckCircle, classes: "border-green-200 bg-green-50 text-green-800" },
  error: { icon: FaExclamationTriangle, classes: "border-red-200 bg-red-50 text-red-800" },
  info: { icon: FaInfoCircle, classes: "border-blue-200 bg-blue-50 text-blue-800" },
};

/**
 * Lightweight toast notification provider. Call ``toast.success(msg)`` etc.
 * Toasts auto-dismiss after a few seconds and stack in the top-right corner.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++counter.current;
      setToasts((current) => [...current, { id, type, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const value = {
    success: (message) => push("success", message),
    error: (message) => push("error", message),
    info: (message) => push("info", message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((toast) => {
          const config = STYLES[toast.type] || STYLES.info;
          const Icon = config.icon;
          return (
            <div
              key={toast.id}
              className={`animate-fade-up flex items-start gap-3 rounded-lg border p-3.5 shadow-lg ${config.classes}`}
              role="alert"
            >
              <Icon className="mt-0.5 shrink-0 text-lg" />
              <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-lg leading-none opacity-60 transition hover:opacity-100"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
