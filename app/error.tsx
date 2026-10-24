'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('[vellum]', error);
  return (
    <div className="mx-auto flex min-h-[86vh] max-w-[420px] flex-col items-start justify-center px-6 py-16">
      <p className="eyebrow">出错了</p>
      <h1 className="mt-6 font-serif text-5xl leading-tight tracking-tight">
        藤蔓断了一根
      </h1>
      <p className="mt-8 text-sm leading-relaxed text-muted">
        服务器在处理这个请求时遇到了问题。可以重试，或者回到花园。
      </p>
      <div className="mt-12 flex gap-4">
        <button type="button" onClick={reset} className="btn btn-accent">
          重试
        </button>
      </div>
    </div>
  );
}
