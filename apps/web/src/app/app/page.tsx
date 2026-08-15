'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/session';
import { useDocumentsQuery } from '@/features/documents/hooks';
import { AppShell } from '@/components/layout/app-shell';

export default function DashboardPage() {
  const { accessToken, user, isRestoring, signOut } = useAuth();
  const router = useRouter();
  const documents = useDocumentsQuery();
  if (isRestoring) return <main className="p-10">Restoring your session…</main>;
  if (!accessToken)
    return (
      <main className="p-10">
        Please <Link href="/auth/login">log in</Link> to manage documents.
      </main>
    );
  const items = documents.data ?? [];
  const count = (status: string) => items.filter((d) => d.status === status).length;
  return (
    <AppShell
      title="Overview"
      actions={
        <>
          <Link href="/app/documents/new" className="os-button-primary">
            + New document
          </Link>
          <button
            onClick={async () => {
              await signOut();
              router.push('/auth/login');
            }}
            className="ml-3 os-button-secondary"
          >
            Log out
          </button>
        </>
      }
    >
      <div className="mb-7">
        <p className="os-eyebrow">{user?.email}</p>
        <h2 className="mt-1 text-3xl font-black tracking-[-.04em]">Document overview</h2>
      </div>
      <section className="grid overflow-hidden rounded-xl border border-slate-800 sm:grid-cols-4">
        {[
          ['DRAFT', 'Draft'],
          ['SENT', 'Out for signature'],
          ['COMPLETED', 'Completed'],
          ['CANCELLED', 'Needs attention'],
        ].map(([status, label]) => (
          <div
            key={status}
            className="border-b border-slate-800 p-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <p className="os-mono">{label}</p>
            <strong className="mt-4 block text-4xl font-black tracking-[-.06em]">
              {count(status)}
            </strong>
          </div>
        ))}
      </section>
      <section className="mt-8 grid gap-8 xl:grid-cols-[1.5fr_.8fr]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent documents</h3>
            <Link href="/app" className="text-sm text-cyan-300">
              View all →
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            {documents.isLoading && <p className="p-5 text-slate-400">Loading documents…</p>}
            {items.map((d) => (
              <Link
                key={d.id}
                href={`/app/documents/${d.id}`}
                className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-slate-800 p-5 last:border-b-0 hover:bg-slate-900/50"
              >
                <div>
                  <strong>{d.title}</strong>
                  <p className="mt-1 os-mono">{d.originalFileName}</p>
                </div>
                <span
                  className={`os-status ${d.status === 'COMPLETED' ? 'border-emerald-300/30 text-emerald-300' : d.status === 'SENT' ? 'border-amber-300/30 text-amber-300' : 'border-slate-700 text-slate-400'}`}
                >
                  {d.status.replaceAll('_', ' ')}
                </span>
                <span className="os-mono">{d.pageCount ?? '?'} PAGES</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Workflow</h3>
            <span className="os-mono">LIVE DATA</span>
          </div>
          <div className="os-surface p-5">
            <p className="text-sm text-slate-300">
              Upload, prepare, send, sign, and finalize documents with a visible audit trail.
            </p>
            <div className="mt-6 h-2 overflow-hidden rounded bg-slate-800">
              <div className="h-full w-full bg-gradient-to-r from-slate-500 via-cyan-400 to-emerald-400" />
            </div>
            <div className="mt-4 flex justify-between os-mono">
              <span>DRAFT</span>
              <span>SENT</span>
              <span>COMPLETED</span>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
