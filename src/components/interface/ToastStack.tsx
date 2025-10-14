import { useEffect } from 'react';
import { useToastStore, type ToastVariant } from '../../store/toastStore';

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info: 'border-[color:var(--ds-info)] bg-[color:var(--ds-info-soft)] text-[color:var(--ds-info)]',
  success: 'border-[color:var(--ds-positive)] bg-[color:var(--ds-positive-soft)] text-[color:var(--ds-positive)]',
  warning: 'border-[color:var(--ds-warning)] bg-[color:var(--ds-warning-soft)] text-[color:var(--ds-warning)]',
  error: 'border-[color:var(--ds-critical)] bg-[color:var(--ds-critical-soft)] text-[color:var(--ds-critical)]',
};

export function ToastStack() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timers = toasts.map((toast) => {
      const duration = toast.duration ?? 5000;
      return setTimeout(() => removeToast(toast.id), duration);
    });
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[100] flex w-80 flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto overflow-hidden rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${VARIANT_STYLES[toast.variant]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold ds-text-primary">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-xs ds-text-secondary">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-xs uppercase tracking-[0.2em] ds-text-secondary transition hover:opacity-100 opacity-80"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
