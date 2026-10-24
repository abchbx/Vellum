import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[86vh] max-w-[420px] flex-col items-start justify-center px-6 py-16">
      <p className="eyebrow">404 · 迷路了</p>
      <h1 className="mt-6 font-serif text-6xl leading-none tracking-tight">
        这条路<br />通向了空白
      </h1>
      <p className="mt-8 text-sm leading-relaxed text-muted">
        就像笔记里一个没有指向任何地方的链接。回到花园，或者换个方向再走一次。
      </p>
      <Link href="/" className="btn btn-accent mt-12">
        回到首页
      </Link>
    </div>
  );
}
