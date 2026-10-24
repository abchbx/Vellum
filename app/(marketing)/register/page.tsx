'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction } from '@/app/actions';

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAction, { ok: false });

  return (
    <div className="mx-auto flex min-h-[86vh] w-full max-w-[420px] flex-col justify-center px-6 py-16">
      <div className="mb-12">
        <Link href="/" className="font-serif text-2xl tracking-tight">Vellum</Link>
      </div>
      <h1 className="font-serif text-3xl">种一座花园</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        起一个 handle，你的花园将拥有自己的门牌：/u/&lt;handle&gt;。
      </p>

      <form action={formAction} className="mt-12 space-y-8">
        {state.ok === false && state.error && (
          <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-accent">
            {state.error}
          </p>
        )}
        <div>
          <label htmlFor="email" className="eyebrow">邮箱</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input mt-2 w-full"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="handle" className="eyebrow">Handle · 3–24 位</label>
          <input
            id="handle"
            name="handle"
            type="text"
            required
            minLength={3}
            maxLength={24}
            pattern="[a-z0-9_-]+"
            className="input mt-2 w-full font-mono"
            placeholder="your-handle"
          />
        </div>
        <div>
          <label htmlFor="password" className="eyebrow">密码 · 至少 8 位</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input mt-2 w-full"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" className="btn btn-accent w-full justify-center">
          开始种植
        </button>
      </form>

      <p className="mt-10 text-sm text-muted">
        已有花园？{' '}
        <Link href="/login" className="link-underline text-ink">
          回到花园 →
        </Link>
      </p>
    </div>
  );
}
