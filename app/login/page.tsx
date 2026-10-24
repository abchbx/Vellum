'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/actions';

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, { ok: false });
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-[86vh] w-full max-w-[420px] flex-col justify-center px-6 py-16">
      <div className="mb-12">
        <Link href="/" className="font-serif text-2xl tracking-tight">Vellum</Link>
      </div>
      <h1 className="font-serif text-3xl">回到花园</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        登录后继续照看你的笔记。新访客可以先种一座新花园。
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
          <label htmlFor="password" className="eyebrow">密码</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input mt-2 w-full"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" className="btn btn-accent w-full justify-center">
          进入工作台
        </button>
      </form>

      <p className="mt-10 text-sm text-muted">
        还没有花园？{' '}
        <Link href="/register" className="link-underline text-ink">
          种一座新的 →
        </Link>
      </p>
      <p className="mt-4 font-mono text-[11px] text-muted/70">
        演示账号 demo@vellum.app / demo1234
      </p>
    </div>
  );
}
