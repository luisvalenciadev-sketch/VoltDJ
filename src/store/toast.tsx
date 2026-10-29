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

const VISIBLE_MS = 4000;
const RESUME_MS = 1500;
const EXIT_MS = 160;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Salida animada: se marca data-leaving y se desmonta cuando termina la transición (--d-exit).
  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setLeaving(true);
    timer.current = setTimeout(() => {
      setToast(null);
      setLeaving(false);
    }, EXIT_MS);
  }, []);

  const schedule = useCallback(
    (ms: number) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(dismiss, ms);
    },
    [dismiss],
  );

  // Sin key por id: un toast nuevo reemplaza el texto del visible en vez de re-montarlo,
  // y si estaba saliendo, la transición se reorienta y vuelve desde donde iba.
  const show = useCallback(
    (message: string, action?: ToastAction) => {
      setToast({ id: Date.now(), message, action });
      setLeaving(false);
      schedule(VISIBLE_MS);
    },
    [schedule],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite">
        {toast && (
          // Con el puntero encima no se cierra: nadie pierde el enlace "Ver carrito" mientras apunta.
          <div className="toast" data-leaving={leaving || undefined} onPointerEnter={() => !leaving && clearTimeout(timer.current)} onPointerLeave={() => !leaving && schedule(RESUME_MS)}>
            <span>{toast.message}</span>
            {toast.action?.href && (
              <Link href={toast.action.href} onClick={dismiss}>
                {toast.action.label}
              </Link>
            )}
            {toast.action?.onClick && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick?.();
                  dismiss();
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
