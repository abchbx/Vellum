import type { noteStatusEnum } from '../db/schema';

const STATUS_META = {
  seedling: { label: '幼苗', color: 'var(--seedling)', hint: '刚写下的想法' },
  budding: { label: '抽芽', color: 'var(--budding)', hint: '有了结构，开始链接' },
  evergreen: { label: '常青', color: 'var(--evergreen)', hint: '经得起重读' },
} as const;

export function StatusBadge({ status }: { status: keyof typeof STATUS_META }) {
  const meta = STATUS_META[status] ?? STATUS_META.seedling;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]"
      style={{ borderColor: `color-mix(in srgb, ${meta.color} 40%, transparent)`, color: meta.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: meta.color }}
        title={meta.hint}
      />
      {meta.label}
    </span>
  );
}

export function statusLabel(status: keyof typeof STATUS_META): string {
  return STATUS_META[status]?.label ?? status;
}

export type NoteStatus = (typeof noteStatusEnum)[number];
