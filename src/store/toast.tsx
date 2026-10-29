"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}
interface ToastState {
  id: number;
  message: string;
  action?: ToastAction;
}

const ToastContext = createContext<(message: string, action?: ToastAction) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((message: string, action?: ToastAction) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), message, action });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <span>{toast.message}</span>
            {toast.action?.href && (
              <Link href={toast.action.href} onClick={() => setToast(null)}>
                {toast.action.label}
              </Link>
            )}
            {toast.action?.onClick && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick?.();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
