'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

import { ApiClientError } from '@/lib/api/client';
import { DocumentPdfViewer } from '@/features/documents/components/document-pdf-viewer';
import {
  useSigningPreviewUrl,
  useSigningRequestQuery,
  useSubmitSigningMutation,
} from '@/features/public-signing/hooks';
import { useSigningFormStore } from '@/stores/signing-form.store';

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const request = useSigningRequestQuery(token);
  const previewUrl = useSigningPreviewUrl(token);
  const submit = useSubmitSigningMutation(token);
  const values = useSigningFormStore((s) => s.values);
  const setValue = useSigningFormStore((s) => s.setValue);
  const requiredMissing = useMemo(
    () => request.data?.fields.some((f) => f.required && !values[f.id]) ?? false,
    [request.data, values],
  );
  if (request.isLoading)
    return <main className="grid min-h-screen place-items-center">Loading signing request…</main>;
  if (request.error) {
    const code = request.error instanceof ApiClientError ? request.error.error.code : '';
    if (code === 'SIGNING_ALREADY_SUBMITTED')
      return (
        <main className="grid min-h-screen place-items-center text-center">
          <h1 className="text-4xl font-black">Signing complete</h1>
          <p className="mt-3 text-slate-300">Thank you. Your signing step has been recorded.</p>
        </main>
      );
    return (
      <main className="grid min-h-screen place-items-center text-center">
        <h1 className="text-3xl font-bold">Signing unavailable</h1>
        <p className="mt-3 text-rose-300">
          {request.error instanceof ApiClientError
            ? request.error.error.message
            : 'Unable to load signing request.'}
        </p>
      </main>
    );
  }
  if (!request.data) return null;
  const data = request.data;
  const completed = data.fields.filter((f) => Boolean(values[f.id])).length;
  const submitValues = data.fields
    .filter((f) => values[f.id] !== undefined && values[f.id] !== '')
    .map((f) => ({
      fieldId: f.id,
      value:
        f.type === 'SIGNATURE' ? { type: 'TYPED_NAME', name: String(values[f.id]) } : values[f.id],
    }));
  return (
    <main className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-[#0c1220] px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded bg-cyan-300 font-black text-slate-950">
            ⌁
          </span>
          <strong>
            OpenSign<span className="text-cyan-300">Flow</span>
          </strong>
        </div>
        <div className="flex items-center gap-3 os-mono">
          <span className="text-emerald-300">◉ SECURE SIGNING SESSION</span>
          <span className="rounded border border-slate-700 px-2 py-1">
            EXPIRES {new Date(data.expiresAt).toLocaleDateString()}
          </span>
        </div>
      </header>
      <div className="border-b border-violet-300/20 bg-violet-400/10 px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>
            <strong>{data.recipientName}</strong> requested your signature on{' '}
            <strong>{data.documentTitle}</strong>
          </span>
          <span className="os-mono">
            {completed}/{data.fields.length} FIELDS
          </span>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 p-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <DocumentPdfViewer
            url={previewUrl}
            fields={data.fields}
            onSelect={(field) =>
              document
                .getElementById(`signing-field-${field.id}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          />
        </section>
        <aside className="h-fit rounded-xl border border-slate-800 bg-[#11131a] p-5">
          <p className="os-eyebrow">YOUR ACTION ITEMS</p>
          <div className="mt-4 grid gap-3">
            {data.fields.map((f) => (
              <label
                id={`signing-field-${f.id}`}
                key={f.id}
                className={`rounded-lg border p-3 ${values[f.id] ? 'border-emerald-300/30 bg-emerald-300/5' : 'border-slate-700 bg-slate-900/50'}`}
              >
                <span className="mb-2 flex justify-between font-semibold">
                  {f.label ?? f.type}
                  {f.required && <small className="text-cyan-300">REQUIRED</small>}
                </span>
                {f.type === 'CHECKBOX' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(values[f.id])}
                    onChange={(e) => setValue(f.id, e.target.checked)}
                  />
                ) : (
                  <input
                    type={f.type === 'DATE' ? 'date' : 'text'}
                    placeholder={
                      f.placeholder ?? (f.type === 'SIGNATURE' ? 'Type your full name' : '')
                    }
                    value={String(values[f.id] ?? '')}
                    onChange={(e) => setValue(f.id, e.target.value)}
                    className="w-full rounded border border-slate-700 bg-[#0a0c12] p-3"
                  />
                )}
              </label>
            ))}
          </div>
          <button
            disabled={submit.isPending || requiredMissing}
            onClick={() => submit.mutate(submitValues)}
            className="mt-5 w-full rounded-lg bg-cyan-300 p-3 font-semibold text-slate-950"
          >
            {submit.isPending ? 'Submitting…' : 'Finish & submit →'}
          </button>
          {requiredMissing && (
            <p className="mt-3 text-sm text-amber-300">
              Complete all required fields before submitting.
            </p>
          )}
          <div className="mt-5 border-t border-slate-800 pt-4 os-mono">
            ◈ SIGNATURE, IP & TIMESTAMP RECORDED
          </div>
        </aside>
      </div>
    </main>
  );
}
