import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import type { Metadata } from 'next';
import '@/styles/globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vellum · 数字花园',
  description:
    '用 Markdown 写笔记，用双向链接把想法连成网，自动生成知识图谱与写作统计。一座种着思想的花园。',
};

const themeScript = `
(function() {
  try {
    var saved = localStorage.getItem('vl-theme');
    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      className={`${fraunces.variable} ${interTight.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <div
          aria-hidden="true"
          className="noise-bg pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-multiply dark:mix-blend-screen dark:opacity-[0.05]"
        />
      </body>
    </html>
  );
}
