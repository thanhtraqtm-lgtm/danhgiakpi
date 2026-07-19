import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';
export interface ToastMsg { id: string; type: ToastType; message: string; }

let listeners: ((t: ToastMsg[]) => void)[] = [];
let toasts: ToastMsg[] = [];

export function showToast(message: string, type: ToastType = 'success') {
  const id = Date.now().toString();
  toasts = [...toasts, { id, type, message }];
  listeners.forEach(l => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    listeners.forEach(l => l(toasts));
  }, 3500);
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const fn = (t: ToastMsg[]) => setItems([...t]);
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  }, []);
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {items.map(t => (
        <div key={t.id} className={`pointer-events-auto min-w-[280px] max-w-[420px] p-3.5 rounded-2xl border shadow-lg backdrop-blur flex items-start gap-2.5 animate-slide-in text-xs font-semibold ${
          t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          t.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-slate-800 border-slate-700 text-white'
        }`}>
          {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : t.type === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="flex-1 leading-relaxed">{t.message}</span>
          <button onClick={() => { toasts = toasts.filter(x => x.id !== t.id); listeners.forEach(l => l(toasts)); }} className="p-0.5 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  );
}
