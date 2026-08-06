/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';

import {
  useAuditEventsQuery,
  useDocumentDownloadMutation,
  useDocumentJobsQuery,
  useDocumentQuery,
  useSendDocumentMutation,
} from '@/features/documents/hooks';
import { useDeleteRecipientMutation, useRecipientsQuery } from '@/features/recipients/hooks';
import { useDeleteFieldMutation, useFieldsQuery } from '@/features/document-fields/hooks';
import { RecipientForm } from '@/features/recipients/components/recipient-form';
import { BulkAssignFieldsForm } from '@/features/document-fields/components/bulk-assign-fields-form';
import { DocumentFieldForm } from '@/features/document-fields/components/document-field-form';
import { useJobProgressStream } from '@/features/documents/use-job-progress-stream';
import { useAuth } from '@/lib/auth/session';
import { RecipientEditForm } from '@/features/recipients/components/recipient-edit-form';
import { DocumentFieldEditForm } from '@/features/document-fields/components/document-field-edit-form';

export default function DocumentDetailPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { accessToken, organizations, activeOrganizationId } = useAuth();
  const org = activeOrganizationId ?? organizations[0]?.organization.id ?? null;
  const doc = useDocumentQuery(documentId);
  const recipients = useRecipientsQuery(documentId);
  const fields = useFieldsQuery(documentId);
  const deleteRecipient = useDeleteRecipientMutation(documentId);
  const deleteField = useDeleteFieldMutation(documentId);
  const send = useSendDocumentMutation(documentId);
  const download = useDocumentDownloadMutation(documentId);
  const jobs = useDocumentJobsQuery(documentId, doc.data?.status === 'COMPLETED');
  useJobProgressStream({ jobId: jobs.data?.[0]?.id, documentId, accessToken, organizationId: org });
  const audit = useAuditEventsQuery(
    documentId,
    Boolean(doc.data && ['SENT', 'VIEWED', 'PARTIALLY_SIGNED'].includes(doc.data.status)),
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  if (doc.isLoading) return <main className="p-8">Loading document…</main>;
  if (doc.isError || !doc.data)
    return <main className="p-8 text-red-400">Unable to load document.</main>;
  const d = doc.data;
  const signers = recipients.data?.filter((r: any) => r.role === 'SIGNER') ?? [];
  return (
    <main className="mx-auto max-w-6xl p-8">
      <header className="rounded-2xl border border-cyan-300/20 bg-slate-950/60 p-7 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[.22em] text-cyan-300">
              DOCUMENT WORKFLOW
            </p>
            <h1 className="mt-2 text-3xl font-bold">{d.title}</h1>
            <p className="mt-2 text-slate-400">
              {d.originalFileName} · {d.pageCount ?? '?'} pages
            </p>
          </div>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-200">
            {d.status}
          </span>
        </div>
      </header>
      <section className="mt-6 rounded-2xl border bg-slate-950/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">PDF preview</h2>
            <p className="text-sm text-slate-400">
              Open the original document while configuring recipients and fields.
            </p>
          </div>
          <button
            onClick={async () => {
              try {
                const result = await download.mutateAsync({
                  variant: 'original',
                  disposition: 'inline',
                });
                setPreviewUrl(result.url);
              } catch {}
            }}
            className="rounded-lg border border-cyan-300/40 px-4 py-2 text-cyan-200"
          >
            {download.isPending ? 'Preparing…' : 'Preview PDF'}
          </button>
        </div>
        {previewUrl && (
          <iframe
            title={d.originalFileName}
            src={previewUrl}
            className="mt-5 h-[600px] w-full rounded-xl border bg-white"
          />
        )}
      </section>
      {message && (
        <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-200">
          {message}
        </p>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-slate-950/50 p-6">
          <h2 className="text-xl font-semibold">Recipients</h2>
          <p className="mt-1 text-sm text-slate-400">
            Add signers or CC recipients for this workflow.
          </p>
          <RecipientForm documentId={documentId} onSuccess={() => setMessage('Recipient added.')} />
          <div className="mt-5 grid gap-2">
            {recipients.data?.map((r: any) => (
              <div key={r.id} className="rounded-lg border bg-slate-900/60 p-3">
                <div className="flex items-center justify-between">
                  <span>
                    <strong>{r.name}</strong>
                    <small className="ml-2 text-slate-400">{r.email}</small>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-cyan-300">
                    {r.role}
                    <button
                      type="button"
                      onClick={() => deleteRecipient.mutate(r.id)}
                      className="text-rose-300"
                    >
                      Remove
                    </button>
                  </span>
                </div>
                <RecipientEditForm
                  documentId={documentId}
                  recipient={r}
                  onSuccess={() => setMessage('Recipient updated.')}
                />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-slate-950/50 p-6">
          <h2 className="text-xl font-semibold">Signing fields</h2>
          <p className="mt-1 text-sm text-slate-400">
            Add simple fields now; visual placement editor follows next.
          </p>
          <DocumentFieldForm
            documentId={documentId}
            signers={signers}
            onSuccess={() => setMessage('Field added.')}
          />
          <div className="mt-5 grid gap-2">
            {fields.data?.map((f: any) => {
              const assignee = recipients.data?.find((r: any) => r.id === f.recipientId);
              return (
                <div key={f.id} className="rounded-lg border bg-slate-900/60 p-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(f.id)}
                      onChange={() =>
                        setSelected(
                          selected.includes(f.id)
                            ? selected.filter((id) => id !== f.id)
                            : [...selected, f.id],
                        )
                      }
                    />
                    <span className="flex flex-1 justify-between">
                      <span>
                        {f.type}{' '}
                        <small className="text-slate-400">
                          page {f.pageNumber} · {assignee?.name ?? 'Unassigned'}
                        </small>
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteField.mutate(f.id)}
                        className="text-xs text-rose-300"
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                  <DocumentFieldEditForm
                    documentId={documentId}
                    field={f}
                    signers={signers}
                    onSuccess={() => setMessage('Field updated.')}
                  />
                </div>
              );
            })}
          </div>
          <BulkAssignFieldsForm
            documentId={documentId}
            fieldIds={selected}
            signers={signers}
            onSuccess={() => {
              setSelected([]);
              setMessage('Fields reassigned.');
            }}
          />
        </section>
      </div>
      <section className="mt-6 rounded-2xl border border-violet-300/20 bg-gradient-to-r from-slate-950/80 to-violet-950/30 p-6">
        <h2 className="text-xl font-semibold">Ready to send?</h2>
        <p className="mt-1 text-sm text-slate-400">
          Every signer needs at least one assigned field before sending.
        </p>
        <button
          disabled={send.isPending || d.status !== 'DRAFT'}
          onClick={() =>
            send.mutate(undefined, {
              onSuccess: () => setMessage('Document sent. Signing emails are being delivered.'),
            })
          }
          className="mt-4 rounded-lg bg-violet-400 px-5 py-3 font-semibold text-slate-950"
        >
          {send.isPending ? 'Sending…' : 'Send document for signing'}
        </button>
      </section>
      {d.status === 'COMPLETED' && (
        <section className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-950/20 p-6">
          <h2 className="text-xl font-semibold">Completed document</h2>
          <p className="mt-1 text-sm text-slate-400">
            {jobs.data?.[0]
              ? `${jobs.data[0].progressPhase ?? jobs.data[0].status} · ${jobs.data[0].progressPercent}% ${jobs.data[0].progressMessage ?? ''}`
              : 'Finalization job is being prepared.'}
          </p>
          <button
            disabled={download.isPending}
            onClick={async () => {
              try {
                const result = await download.mutateAsync({
                  variant: 'completed',
                  disposition: 'attachment',
                });
                window.open(result.url, '_blank', 'noopener,noreferrer');
              } catch {}
            }}
            className="mt-4 rounded-lg bg-emerald-300 px-5 py-3 font-semibold text-slate-950"
          >
            {download.isPending ? 'Preparing download…' : 'Download completed PDF'}
          </button>
        </section>
      )}
      <section className="mt-6 rounded-2xl border bg-slate-950/50 p-6">
        <h2 className="text-xl font-semibold">Activity</h2>
        <div className="mt-4 grid gap-3">
          {audit.isLoading && <p className="text-slate-400">Loading activity…</p>}
          {audit.data?.map((event) => (
            <div key={event.id} className="border-l-2 border-cyan-300/50 pl-3">
              <strong>{event.eventType.replaceAll('_', ' ')}</strong>
              <p className="text-sm text-slate-400">
                {event.actorEmail ?? event.actorType} · {new Date(event.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
