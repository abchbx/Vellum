'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SearchItem {
  id: string;
  title: string;
  slug: string;
  snippet: string | null;
  status: string;
  published: boolean;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const go = useCallback((item: SearchItem) => {
    setOpen(false);
    router.push(`/app?note=${item.id}`);
  }, [router]);

  const openPalette = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !open) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ('');
      setItems([]);
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 1) {
      setItems([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const json = await res.json();
        if (json.ok) {
          setItems(json.data.items as SearchItem[]);
          setActive(0);
        }
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[active];
        if (item) go(item);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, active, go]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPalette}
        aria-label="打开命令面板"
        className="fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full border border-line bg-surface text-muted shadow-sm transition-all duration-320 hover:border-ink hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="命令面板"
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />
      <div className="paper relative w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索笔记正文…"
            className="w-full bg-transparent text-base text-ink outline-none placeholder:text-muted/60"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[44vh] overflow-y-auto p-2">
          {loading && <div className="px-3 py-6 text-center text-sm text-muted">检索中…</div>}
          {!loading && q.trim().length > 0 && items.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted">没有命中任何笔记</div>
          )}
          {items.map((item, i) => (
            <button
              key={item.id}
              data-idx={i}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
              className={`flex w-full flex-col items-start gap-1 rounded-xl px-4 py-3 text-left transition-colors ${
                i === active ? 'bg-surface-2' : ''
              }`}
            >
              <span className="text-[15px]">{item.title}</span>
              {item.snippet ? (
                <span
                  className="line-clamp-2 text-[13px] text-muted"
                  dangerouslySetInnerHTML={{ __html: item.snippet }}
                />
              ) : (
                <span className="text-[13px] text-muted">{item.slug}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
