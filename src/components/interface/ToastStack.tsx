import { useEffect } from 'react';
import { useToastStore, type ToastVariant } from '../../store/toastStore';

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info: 'border-sky-400/50 bg-sky-500/10 text-sky-100',
  success: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  error: 'border-rose-400/40 bg-rose-500/10 text-rose-100',
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
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-xs text-white/70">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-xs uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
