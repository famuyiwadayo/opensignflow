'use client';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api/client';
import { useUploadDocumentMutation } from '@/features/documents/hooks';
import { useAuth } from '@/lib/auth/session';
import { useDocumentEditorStore } from '@/stores/document-editor.store';

export default function NewDocumentPage() {
  const { accessToken, organizations, activeOrganizationId } = useAuth();
  const router = useRouter();
  const org = activeOrganizationId ?? organizations[0]?.organization.id ?? null;
  const [file, setFile] = useState<File | null>(null);

  const progress = useDocumentEditorStore((s) => s.uploadProgress);
  const setProgress = useDocumentEditorStore((s) => s.setUploadProgress);
  const upload = useUploadDocumentMutation(setProgress);

  useEffect(() => () => setProgress(0), [setProgress]);

  function submit() {
    if (!file) return;
    upload.mutate(file, { onSuccess: (document) => router.push(`/app/documents/${document.id}`) });
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/60 p-8 shadow-2xl">
        <p className="text-xs font-semibold tracking-[.22em] text-cyan-300">NEW WORKFLOW</p>
        <h1 className="mt-2 text-2xl font-bold">Upload document</h1>
        <p className="mt-2 text-slate-400">Upload a PDF to start a signing workflow.</p>
        <input
          className="mt-6"
          type="file"
          accept="application/pdf"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && (
          <p className="mt-3 text-sm">
            {file.name} · {Math.round(file.size / 1024)} KB
          </p>
        )}
        <button
          disabled={!file || upload.isPending || !accessToken || !org}
          onClick={submit}
          className="mt-6 rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950"
        >
          {upload.isPending ? 'Uploading…' : 'Upload PDF'}
        </button>
        {upload.isPending && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded bg-slate-800">
              <div className="h-full bg-cyan-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-300">Uploading {progress}%</p>
          </div>
        )}
        {upload.error && (
          <p className="mt-3 text-red-300">
            {upload.error instanceof ApiClientError ? upload.error.error.message : 'Upload failed.'}
          </p>
        )}
      </div>
    </main>
  );
}
