'use client';
import { useEffect } from 'react';
import { useNotificationStore } from '../../stores/notification.store';

export function Toaster() {
  const items = useNotificationStore((s) => s.items);
  const remove = useNotificationStore((s) => s.remove);

  useEffect(() => {
    const timers = items.map((i) => setTimeout(() => remove(i.id), 6000));
    return () => timers.forEach(clearTimeout);
  }, [items, remove]);

  return (
    <div className="fixed right-5 top-5 z-50 grid w-[360px] gap-3">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => remove(item.id)}
          className={`rounded-xl border p-4 text-left shadow-xl backdrop-blur ${item.kind === 'error' ? 'border-rose-400/40 bg-rose-950/90 text-rose-100' : 'border-emerald-400/40 bg-emerald-950/90 text-emerald-100'}`}
        >
          <strong className="block">{item.title}</strong>
          {item.message && <span className="mt-1 block text-sm opacity-90">{item.message}</span>}
        </button>
      ))}
    </div>
  );
}
