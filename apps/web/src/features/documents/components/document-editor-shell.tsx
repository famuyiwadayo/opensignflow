import type { ReactNode } from 'react';

export function DocumentEditorShell({
  topbar,
  sidebar,
  canvas,
  inspector,
  statusbar,
}: {
  topbar: ReactNode;
  sidebar: ReactNode;
  canvas: ReactNode;
  inspector: ReactNode;
  statusbar: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#080c16] text-slate-100">
      <header className="flex min-h-16 items-center justify-between border-b border-slate-800 bg-[#0c1220]/95 px-6 backdrop-blur">
        {topbar}
      </header>
      <div className="grid min-h-[calc(100vh-64px-36px)] grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="border-r border-slate-800 bg-[#0b111e] p-4">{sidebar}</aside>
        <section className="min-w-0 overflow-auto bg-[radial-gradient(circle_at_50%_20%,#17233f_0%,#070b15_62%)] p-8">
          {canvas}
        </section>
        <aside className="border-l border-slate-800 bg-[#0b111e] p-5">{inspector}</aside>
      </div>
      <footer className="flex h-9 items-center justify-between border-t border-slate-800 bg-[#0c1220] px-5 text-xs text-slate-400">
        {statusbar}
      </footer>
    </main>
  );
}
