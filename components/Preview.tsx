'use client';

import { useMemo } from 'react';
import { renderMarkdown } from '@/lib/markdown';

export function Preview({ md }: { md: string }) {
  const html = useMemo(() => renderMarkdown(md), [md]);
  return (
    <div
      className="text-[17px] leading-[1.75]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
