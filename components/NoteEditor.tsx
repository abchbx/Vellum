'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { Preview } from './Preview';
import type { NoteStatus } from './StatusBadge';

export interface EditorNote {
  id: string;
  title: string;
  slug: string;
  contentMd: string;
  excerpt: string;
  status: NoteStatus;
  published: boolean;
  readingMins: number;
  createdAt: string;
  updatedAt: string;
  tags?: { id: string; name: string; color: string }[];
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

interface ToolDef {
  key: string;
  label: string;
  title: string;
  apply: (selected: string) => string;
}

const TOOLS: ToolDef[] = [
  { key: 'h1', label: 'H1', title: '一级标题', apply: (s) => `# ${s || '标题'}\n` },
  { key: 'h2', label: 'H2', title: '二级标题', apply: (s) => `## ${s || '标题'}\n` },
  { key: 'h3', label: 'H3', title: '三级标题', apply: (s) => `### ${s || '标题'}\n` },
  { key: 'bold', label: 'B', title: '粗体', apply: (s) => `**${s || '粗体'}**` },
  { key: 'italic', label: 'I', title: '斜体', apply: (s) => `*${s || '斜体'}*` },
  { key: 'quote', label: '❝', title: '引用', apply: (s) => `> ${s || '引用'}\n` },
  { key: 'ul', label: '•', title: '列表', apply: (s) => `- ${s || '列表项'}\n` },
  { key: 'ol', label: '1.', title: '有序列表', apply: (s) => `1. ${s || '列表项'}\n` },
  { key: 'code', label: '</>', title: '代码块', apply: (s) => '\n```\n' + (s || '代码') + '\n```\n' },
  { key: 'link', label: '🔗', title: '链接', apply: (s) => `[${s || '文字'}](https://)` },
  { key: 'wiki', label: '[[', title: '双向链接', apply: (s) => `[[${s || '笔记标题'}]]` },
  { key: 'table', label: '▦', title: '表格', apply: () => `\n| 列 A | 列 B |\n|---|---|\n| 值 | 值 |\n` },
  { key: 'image', label: '🖼', title: '图片', apply: (s) => `![${s || '描述'}](https://)` },
];

export function NoteEditor({ note, basePath }: { note: EditorNote | null; basePath: string }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<NoteStatus>('seedling');
  const [published, setPublished] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [save, setSave] = useState<SaveState>('idle');
  const [preview, setPreview] = useState(false);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState('');
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setContent(note.contentMd);
    setStatus(note.status);
    setPublished(note.published);
    setTags(note.tags?.map((t) => t.name) ?? []);
    setBaseUpdatedAt(String(note.updatedAt));
    setSave('idle');
    dirtyRef.current = false;
  }, [note]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setSave('idle');
  }, []);

  const saveNow = useCallback(
    async (publish: boolean | null = null) => {
      if (!note) return;
      setSave('saving');
      const payload: Record<string, unknown> = {
        title: title.trim() || '无题',
        contentMd: content,
        status,
      };
      if (publish !== null) payload.published = publish;
      payload.tagNames = tags;
      try {
        const res = await fetch(`/api/notes/${note.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, version: baseUpdatedAt }),
        });
        if (res.status === 409) {
          setSave('conflict');
          return;
        }
        if (!res.ok) throw new Error('save failed');
        dirtyRef.current = false;
        setSave('saved');
        setTimeout(() => setSave((s) => (s === 'saved' ? 'idle' : s)), 2200);
      } catch {
        setSave('error');
      }
    },
    [note, title, content, status, tags, baseUpdatedAt],
  );

  useEffect(() => {
    if (!dirtyRef.current || !note) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveNow(null), 1600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, title, status, tags, saveNow, note]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirtyRef.current) saveNow(null);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        saveNow(true);
        setPublished(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveNow]);

  const applyTool = useCallback(
    (tool: ToolDef) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.slice(start, end);
      const replaced = tool.apply(selected);
      const next = content.slice(0, start) + replaced + content.slice(end);
      setContent(next);
      markDirty();
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + replaced.length;
        ta.setSelectionRange(Math.max(start, pos - replaced.length), pos);
      });
    },
    [content, markDirty],
  );

  if (!note) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <svg width="34" height="34" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 30 V14 M16 14 C16 8, 22 6, 25 9 C28 12, 26 18, 16 14 M16 14 C16 8, 10 6, 7 9 C4 12, 6 18, 16 14" stroke="var(--seedling)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-muted">从左侧选择一篇笔记，或新建一座想法的幼苗。</p>
      </div>
    );
  }

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
    markDirty();
  };

  const wordCount = content.length;
  const readMins = Math.max(1, Math.round((content.match(/[一-鿿]/g)?.length ?? 0) / 350));

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-6 py-4">
        <StatusBadge status={status} />
        <span className="font-mono text-xs text-muted tabular">{note.slug}</span>
        <span className="mx-1 h-3 w-px bg-line" />
        <div className="flex items-center gap-1.5">
          {(['seedling', 'budding', 'evergreen'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                markDirty();
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                status === s ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
              }`}
            >
              {({ seedling: '幼苗', budding: '抽芽', evergreen: '常青' } as const)[s]}
            </button>
          ))}
        </div>
        <label className="ml-2 flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => {
              setPublished(e.target.checked);
              saveNow(e.target.checked);
            }}
            className="accent-[var(--accent)]"
          />
          公开
        </label>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[11px] tabular text-muted">
            {save === 'saving' ? '保存中…' : save === 'saved' ? '已保存' : save === 'error' ? '保存失败' : save === 'conflict' ? '版本已过期，已为你刷新' : ''}
          </span>
          <button
            type="button"
            onClick={() => saveNow(null)}
            disabled={!dirtyRef.current}
            className="btn btn-ghost disabled:opacity-40"
          >
            ⌘S 保存
          </button>
          <button
            type="button"
            onClick={() => {
              saveNow(true);
              setPublished(true);
            }}
            className="btn btn-accent"
          >
            ⌘↵ 发布
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 flex flex-col overflow-hidden ${preview ? 'hidden md:flex' : ''}`}>
          <div className="mx-auto w-full max-w-[680px] px-6 pt-8">
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
              placeholder="无题"
              className="w-full bg-transparent font-serif text-4xl tracking-tight text-ink outline-none placeholder:text-muted/50"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => {
                      setTags(tags.filter((x) => x !== t));
                      markDirty();
                    }}
                    className="text-muted/60 hover:text-ink"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="+ 标签"
                className="w-24 bg-transparent text-[11px] text-muted outline-none placeholder:text-muted/50"
              />
            </div>
          </div>

          <div className="mx-auto mt-2 w-full max-w-[680px] px-6">
            <div className="my-6 h-px bg-line" />
            <div className="flex flex-wrap items-center gap-1 border-b border-line pb-2">
              {TOOLS.map((tool) => (
                <button
                  key={tool.key}
                  type="button"
                  title={tool.title}
                  aria-label={tool.title}
                  onClick={() => applyTool(tool)}
                  className="grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  {tool.label}
                </button>
              ))}
              <span className="ml-auto font-mono text-[10px] text-muted/60">Markdown 工具栏</span>
            </div>
          </div>

          <div className="mx-auto flex-1 w-full max-w-[680px] overflow-y-auto px-6 pb-10">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                markDirty();
              }}
              placeholder={'在这里种下想法。\n\n用 [[双向链接]] 指向另一篇笔记，链接会自动长出来。'}
              className="w-full resize-none bg-transparent font-sans text-[17px] leading-[1.7] text-ink outline-none placeholder:text-muted/50"
              style={{ minHeight: '40vh' }}
            />
          </div>
        </div>
        {preview && (
          <div className="flex-1 overflow-y-auto border-l border-line">
            <div className="mx-auto max-w-[680px] px-6 py-10">
              <Preview md={content} basePath={basePath} />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line px-6 py-3">
        <button type="button" onClick={() => setPreview((p) => !p)} className="text-xs text-muted transition-colors hover:text-ink">
          {preview ? '← 返回编辑' : '预览 →'}
        </button>
        <span className="font-mono text-[11px] tabular text-muted">
          {wordCount} 字 · 约 {readMins} 分钟阅读
        </span>
        <span className="font-mono text-[11px] tabular text-muted">
          ⌘S 保存 · ⌘↵ 发布 · 自动保存已开启
        </span>
      </div>
    </div>
  );
}
