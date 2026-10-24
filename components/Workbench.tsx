'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NoteEditor, type EditorNote } from '@/components/NoteEditor';
import { StatusBadge } from '@/components/StatusBadge';
import { createNoteAction } from '@/actions';

interface NoteItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: string;
  published: boolean;
  updatedAt: string;
}

interface BacklinkItem {
  id: string;
  title: string;
  slug: string;
  updatedAt: string;
}

export function Workbench() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selected, setSelected] = useState<EditorNote | null>(null);
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadNotes = useCallback(async (status?: string) => {
    const res = await fetch(`/api/notes?limit=50${status ? `&status=${status}` : ''}`);
    const json = await res.json();
    if (json.ok) setNotes(json.data.items as NoteItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const selectNote = useCallback(async (id: string) => {
    const [detail, backs] = await Promise.all([
      fetch(`/api/notes/${id}`).then((r) => r.json()),
      fetch(`/api/notes/${id}/backlinks`).then((r) => r.json()),
    ]);
    if (detail.ok) {
      const n = detail.data.note as EditorNote;
      setSelected(n);
      router.replace(`/app?note=${id}`, { scroll: false });
    }
    if (backs.ok) setBacklinks(backs.data.items as BacklinkItem[]);
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('note');
    if (id) selectNote(id);
  }, [selectNote]);

  const onNew = async () => {
    const form = new FormData();
    form.set('title', `未命名笔记 ${new Date().toLocaleDateString('zh-CN')}`);
    const result = await createNoteAction(form);
    if (result.ok) {
      await loadNotes();
      const res = await fetch('/api/notes?limit=1');
      const json = await res.json();
      const latest = json.data.items?.[0];
      if (latest) selectNote(latest.id);
    }
  };

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSelected(null);
      await loadNotes();
    }
  };

  const onRefresh = async () => {
    await loadNotes();
    if (selected) await selectNote(selected.id);
  };

  return (
    <div className="flex h-[calc(100vh-65px)] overflow-hidden">
      {/* 笔记列表 */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-line md:flex">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="eyebrow">笔记 · NOTES</span>
          <button type="button" onClick={onNew} className="text-sm text-accent link-underline" title="新建笔记">
            + 新建
          </button>
        </div>
        <div className="flex gap-1 px-4 pb-3">
          {['', 'seedling', 'budding', 'evergreen'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusFilter(s);
                loadNotes(s || undefined);
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                statusFilter === s ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
              }`}
            >
              {{ '': '全部', seedling: '幼苗', budding: '抽芽', evergreen: '常青' }[s]}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {loading && <p className="px-2 py-6 text-sm text-muted">载入中…</p>}
          {notes.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => selectNote(n.id)}
              className={`mb-1 flex w-full flex-col gap-1 rounded-xl px-3 py-3 text-left transition-colors ${
                selected?.id === n.id ? 'bg-surface-2' : 'hover:bg-surface-2/50'
              }`}
            >
              <span className="flex items-center gap-2 text-sm">
                {n.title}
              </span>
              <span className="line-clamp-1 text-xs text-muted">{n.excerpt || '（空白）'}</span>
              <span className="mt-1 flex items-center gap-2">
                <StatusBadge status={n.status as 'seedling' | 'budding' | 'evergreen'} />
                {n.published && <span className="font-mono text-[10px] text-evergreen">已公开</span>}
              </span>
            </button>
          ))}
          {!loading && notes.length === 0 && (
            <p className="px-2 py-6 text-sm text-muted">还没有笔记。点「+ 新建」，种下第一株幼苗。</p>
          )}
        </div>
      </aside>

      {/* 移动端笔记列表（标签页形态） */}
      <details className="flex md:hidden" open={selected === null}>
        <summary className="list-none cursor-pointer border-b border-line px-5 py-4">
          <span className="eyebrow">笔记</span>
        </summary>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {notes.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => selectNote(n.id)}
              className="mb-1 flex w-full flex-col gap-1 rounded-xl px-3 py-3 text-left"
            >
              <span className="text-sm">{n.title}</span>
              <span className="line-clamp-1 text-xs text-muted">{n.excerpt}</span>
            </button>
          ))}
        </div>
      </details>

      {/* 编辑器 */}
      <main className="min-w-0 flex-1">
        <NoteEditor note={selected} key={selected?.id ?? 'none'} />
      </main>

      {/* 元信息与反向链接 */}
      <aside className="hidden w-[280px] shrink-0 flex-col border-l border-line lg:flex">
        <div className="border-b border-line px-5 py-4">
          <span className="eyebrow">元信息</span>
          {selected ? (
            <>
              <dl className="mt-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">slug</dt>
                  <dd className="text-ink">{selected.slug}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">字数</dt>
                  <dd className="text-ink tabular">{selected.contentMd.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">阅读</dt>
                  <dd className="text-ink tabular">{selected.readingMins} 分钟</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">更新</dt>
                  <dd className="text-ink tabular">
                    {selected.updatedAt instanceof Date
                      ? selected.updatedAt.toLocaleDateString('zh-CN')
                      : new Date(selected.updatedAt).toLocaleDateString('zh-CN')}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => selected && onDelete(selected.id)}
                className="mt-6 w-full rounded-lg border border-line py-2 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
              >
                删除这篇笔记
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="mt-2 w-full rounded-lg border border-line py-2 text-xs text-muted transition-colors hover:text-ink"
              >
                刷新
              </button>
            </>
          ) : (
            <p className="mt-4 text-xs text-muted">选择一篇笔记查看元信息。</p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <span className="eyebrow">反向链接 · {backlinks.length}</span>
          {backlinks.length === 0 ? (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              还没有人链接到这里。用 <span className="font-mono">[[{selected?.slug ?? 'slug'}]]</span> 在别的笔记里提它。
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {backlinks.map((b) => (
                <a
                  key={b.id}
                  href={`/app?note=${b.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    selectNote(b.id);
                  }}
                  className="block"
                >
                  <div className="border-l-2 border-line pl-3">
                    <p className="text-sm text-ink">「{b.title}」</p>
                    <p className="mt-1 font-mono text-[10px] text-muted">
                      {new Date(b.updatedAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
