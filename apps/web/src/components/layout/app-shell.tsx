import Link from 'next/link';
import type { ReactNode } from 'react';

export function AppShell({
  children,
  title,
  actions,
}: {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0c12] text-slate-100">
      <aside className="fixed inset-y-0 w-64 border-r border-slate-800 bg-[#0b111e] p-5">
        <Link href="/app" className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded bg-cyan-300 text-slate-950">
            ⌁
          </span>
          OpenSign<span className="text-cyan-300">Flow</span>
        </Link>
        <p className="mt-10 os-eyebrow">WORKSPACE</p>
        <nav className="mt-3 grid gap-1 text-sm">
          <Link href="/app" className="rounded-md bg-cyan-300/10 px-3 py-2 text-cyan-200">
            Overview
          </Link>
          <Link href="/app" className="rounded-md px-3 py-2 text-slate-400 hover:bg-slate-800">
            Documents
          </Link>
          <Link href="/app" className="rounded-md px-3 py-2 text-slate-400 hover:bg-slate-800">
            Recipients
          </Link>
          <Link href="/app" className="rounded-md px-3 py-2 text-slate-400 hover:bg-slate-800">
            Audit log
          </Link>
        </nav>
        <p className="mt-8 os-eyebrow">CONFIGURE</p>
        <nav className="mt-3 grid gap-1 text-sm">
          <Link href="/app" className="rounded-md px-3 py-2 text-slate-400 hover:bg-slate-800">
            Settings
          </Link>
        </nav>
      </aside>
      <div className="ml-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-[#0c1220] px-7">
          <div>
            <p className="os-eyebrow">WORKSPACE</p>
            <h1 className="text-sm font-semibold">{title}</h1>
          </div>
          {actions}
        </header>
        <main className="p-7">{children}</main>
      </div>
    </div>
  );
}
