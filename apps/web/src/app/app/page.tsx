'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/session';
import { useDocumentsQuery } from '@/features/documents/hooks';

export default function DashboardPage() {
  const { accessToken, signOut, user, isRestoring } = useAuth();
  const router = useRouter();
  // const org = activeOrganizationId ?? organizations[0]?.organization.id ?? null;

  const documents = useDocumentsQuery();
  if (isRestoring) return <main className="p-10">Restoring your session…</main>;

  if (!accessToken) {
    return (
      <main className="p-10">
        <h1>Welcome to OpenSignFlow</h1>
        <p>
          Please <Link href="/auth/login">log in</Link> to manage documents.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-slate-600">{user?.email}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/app/documents/new" className="rounded bg-slate-900 px-3 py-2 text-white">
            Upload PDF
          </Link>
          <button
            onClick={async () => {
              await signOut();
              router.push('/auth/login');
            }}
            className="rounded border px-3 py-2"
          >
            Log out
          </button>
        </div>
      </header>
      <section className="mt-8">
        <h2 className="font-semibold">Your workflow documents</h2>
        {documents.isLoading && <p className="mt-4">Loading documents…</p>}
        {documents.isError && <p className="mt-4 text-red-600">Unable to load documents.</p>}
        <div className="mt-4 grid gap-3">
          {documents.data?.map((d) => (
            <Link
              key={d.id}
              href={`/app/documents/${d.id}`}
              className="rounded border p-4 hover:bg-slate-50"
            >
              <div className="flex justify-between">
                <strong>{d.title}</strong>
                <span>{d.status}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {d.originalFileName} · {d.pageCount ?? '?'} pages
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
