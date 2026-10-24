'use client';

import { useMemo } from 'react';
import { renderMarkdown } from '@/lib/markdown';

export function Preview({ md, basePath }: { md: string; basePath: string }) {
  const html = useMemo(() => renderMarkdown(md, basePath), [md, basePath]);
  return (
    <div
      className="text-[17px] leading-[1.75]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
