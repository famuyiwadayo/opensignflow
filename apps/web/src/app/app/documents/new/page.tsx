'use client';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api/client';
import { useUploadDocumentMutation } from '@/features/documents/hooks';
import { useAuth } from '@/lib/auth/session';
import { useDocumentEditorStore } from '@/stores/document-editor.store';
import { AppShell } from '@/components/layout/app-shell';

export default function NewDocumentPage() {
  const { accessToken, organizations, activeOrganizationId } = useAuth();
  const router = useRouter();
  const org = activeOrganizationId ?? organizations[0]?.organization.id ?? null;
  const [file, setFile] = useState<File | null>(null);
  const progress = useDocumentEditorStore((s) => s.uploadProgress);
  const setProgress = useDocumentEditorStore((s) => s.setUploadProgress);
  const upload = useUploadDocumentMutation(setProgress);
  useEffect(() => () => setProgress(0), [setProgress]);
  return (
    <AppShell title="New document">
      <div className="mx-auto max-w-2xl">
        <p className="os-eyebrow">DOCUMENT LIBRARY</p>
        <h2 className="mt-2 text-4xl font-black tracking-[-.05em]">Start a signing workflow.</h2>
        <p className="mt-4 max-w-xl text-slate-300">
          Upload a PDF to create a private draft document. Add signers, place fields, and send when
          you are ready.
        </p>
        <section className="os-surface mt-8 p-7">
          <label className="grid min-h-56 cursor-pointer place-items-center border border-dashed border-cyan-300/40 bg-cyan-300/5 text-center">
            <input
              className="hidden"
              type="file"
              accept="application/pdf"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
            />
            <div>
              <strong className="text-lg text-cyan-200">Choose a PDF</strong>
              <p className="mt-2 os-mono">PDF ONLY · MAX 10 MB</p>
            </div>
          </label>
          {file && (
            <div className="mt-5 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <strong>{file.name}</strong>
              <p className="mt-1 os-mono">{Math.round(file.size / 1024)} KB</p>
            </div>
          )}
          <button
            disabled={!file || upload.isPending || !accessToken || !org}
            onClick={() =>
              file &&
              upload.mutate(file, {
                onSuccess: (document) => router.push(`/app/documents/${document.id}`),
              })
            }
            className="os-button-primary mt-6"
          >
            {upload.isPending ? 'Uploading…' : 'Create draft document'}
          </button>
          {upload.isPending && (
            <div className="mt-5">
              <div className="h-2 overflow-hidden rounded bg-slate-800">
                <div className="h-full bg-cyan-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 os-mono">UPLOADING {progress}%</p>
            </div>
          )}
          {upload.error && (
            <p className="mt-4 text-rose-300">
              {upload.error instanceof ApiClientError
                ? upload.error.error.message
                : 'Upload failed.'}
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
