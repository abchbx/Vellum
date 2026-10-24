'use client';

import { useEffect, useState } from 'react';

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const show = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };
  return { message, show, setMessage };
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[fadeUp_320ms_var(--ease-vellum)_both]"
    >
      <div className="paper flex items-center gap-4 rounded-full px-5 py-3 shadow-lg">
        <span className="text-sm">{message}</span>
        <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label="关闭提示">
          ✕
        </button>
      </div>
    </div>
  );
}
