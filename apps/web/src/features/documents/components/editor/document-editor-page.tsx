/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/session';
import {
  useAuditEventsQuery,
  useDocumentJobsQuery,
  useDocumentQuery,
  useSendDocumentMutation,
} from '@/features/documents/hooks';
import {
  useCreateFieldMutation,
  useFieldsQuery,
  useUpdateFieldMutation,
} from '@/features/document-fields/hooks';
import { useRecipientsQuery } from '@/features/recipients/hooks';
import { useDocumentEditorStore } from '@/stores/document-editor.store';
import { DocumentEditorShell } from '../document-editor-shell';
import { EditorCanvas } from './editor-canvas';
import { EditorInspector } from './editor-inspector';
import { EditorSidebar } from './editor-sidebar';
import { EditorStatusbar } from './editor-statusbar';
import { EditorToolbar } from '../editor-toolbar';
import { recipientColor } from '../../recipient-colors';

export function DocumentEditorPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { accessToken, organizations, activeOrganizationId } = useAuth();
  const organizationId = activeOrganizationId ?? organizations[0]?.organization.id ?? null;
  const documentQuery = useDocumentQuery(documentId);
  const recipients = useRecipientsQuery(documentId);
  const fields = useFieldsQuery(documentId);
  const send = useSendDocumentMutation(documentId);
  // const download = useDocumentDownloadMutation(documentId);
  const createField = useCreateFieldMutation(documentId);
  const updateField = useUpdateFieldMutation(documentId);
  const zoom = useDocumentEditorStore((state) => state.zoom);
  const currentPage = useDocumentEditorStore((state) => state.currentPage);
  const setPage = useDocumentEditorStore((state) => state.setPage);
  const setZoom = useDocumentEditorStore((state) => state.setZoom);
  const selectedIds = useDocumentEditorStore((state) => state.selectedFieldIds);
  const setSelectedFields = useDocumentEditorStore((state) => state.setSelectedFields);
  const selectedRecipientId = useDocumentEditorStore((state) => state.selectedRecipientId);
  const setSelectedRecipient = useDocumentEditorStore((state) => state.setSelectedRecipient);
  const activeFieldType = useDocumentEditorStore((state) => state.activeFieldType);
  const setActiveFieldType = useDocumentEditorStore((state) => state.setActiveFieldType);
  const isPlacingField = useDocumentEditorStore((state) => state.isPlacingField);
  const setPlacingField = useDocumentEditorStore((state) => state.setPlacingField);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const document = documentQuery.data;
  const signers = recipients.data?.filter((recipient: any) => recipient.role === 'SIGNER') ?? [];
  const coloredFields = (fields.data ?? []).map((field: any) => ({
    ...field,
    color: recipientColor(
      field.recipientId,
      signers.map((signer: any) => signer.id),
    ),
  }));
  const selectedField = fields.data?.find((field: any) => field.id === selectedIds[0]);
  useDocumentJobsQuery(documentId, document?.status === 'COMPLETED');
  useAuditEventsQuery(
    documentId,
    Boolean(document && ['SENT', 'VIEWED', 'PARTIALLY_SIGNED'].includes(document.status)),
  );

  if (documentQuery.isLoading) return <main className="p-8">Loading document editor…</main>;
  if (!document) return <main className="p-8 text-rose-300">Unable to load document.</main>;

  async function preview() {
    // const result = await download.mutateAsync({ variant: 'original', disposition: 'inline' });
    // setPreviewUrl(result.url);
    setPreviewUrl(`${process.env.NEXT_PUBLIC_API_URL}/v1/documents/${documentId}/preview`);
  }

  return (
    <DocumentEditorShell
      topbar={
        <EditorToolbar
          title={document.title}
          status={document.status}
          onSend={() => send.mutate()}
          sending={send.isPending}
        />
      }
      sidebar={
        <EditorSidebar
          documentId={documentId}
          recipients={recipients.data ?? []}
          fields={coloredFields}
          selectedFieldIds={selectedIds}
          currentPage={currentPage}
          pageCount={document.pageCount ?? 1}
          onPageChange={(page) => {
            setPage(page);
            setSelectedFields([]);
          }}
          onSelectField={(id, selected) =>
            setSelectedFields(
              selected ? [...selectedIds, id] : selectedIds.filter((fieldId) => fieldId !== id),
            )
          }
          onSuccess={() => setSelectedFields([])}
        />
      }
      canvas={
        <>
          <div className="mb-4 flex gap-2">
            <select
              value={selectedRecipientId ?? ''}
              onChange={(event) => setSelectedRecipient(event.target.value || null)}
              className="rounded-lg border bg-slate-900 p-2"
            >
              <option value="">Choose signer…</option>
              {signers.map((recipient: any) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name}
                </option>
              ))}
            </select>
            <select
              value={activeFieldType}
              onChange={(event) => setActiveFieldType(event.target.value as any)}
              className="rounded-lg border bg-slate-900 p-2"
            >
              {['SIGNATURE', 'INITIALS', 'TEXT', 'DATE', 'CHECKBOX'].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <button
              onClick={() => preview().catch(() => undefined)}
              className="rounded-lg border border-cyan-300/40 px-3 py-2 text-cyan-200"
            >
              Preview PDF
            </button>
            <button
              disabled={!selectedRecipientId}
              onClick={() => setPlacingField(!isPlacingField)}
              className="rounded-lg bg-cyan-300 px-3 py-2 font-semibold text-slate-950"
            >
              {isPlacingField ? 'Click PDF to place' : 'Place field'}
            </button>
          </div>
          <EditorCanvas
            previewUrl={previewUrl}
            fields={coloredFields}
            headers={{
              Authorization: `Bearer ${accessToken}`,
              'X-Organization-Id': organizationId ?? '',
            }}
            onSelect={(field) => setSelectedFields([field.id])}
            onPlace={({ pageNumber, x, y }) => {
              if (isPlacingField && selectedRecipientId)
                createField.mutate(
                  {
                    recipientId: selectedRecipientId,
                    type: activeFieldType,
                    pageNumber,
                    x,
                    y,
                    width: 0.28,
                    height: 0.07,
                    required: true,
                  },
                  { onSuccess: () => setPlacingField(false) },
                );
            }}
            onMoveEnd={({ field, x, y }) => updateField.mutate({ id: field.id, body: { x, y } })}
            onResizeEnd={({ field, width, height }) =>
              updateField.mutate({ id: field.id, body: { width, height } })
            }
            onRefresh={() => preview().catch(() => undefined)}
            zoom={zoom}
            activeRecipientId={selectedRecipientId}
          />
        </>
      }
      inspector={
        <EditorInspector
          documentId={documentId}
          field={selectedField}
          signers={signers}
          onDeleted={() => setSelectedFields([])}
        />
      }
      statusbar={
        <>
          <EditorStatusbar page={1} zoom={zoom} selected={selectedIds.length} />
          <div className="flex gap-2">
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>−</button>
            <button onClick={() => setZoom(1)}>Fit width</button>
            <button onClick={() => setZoom(Math.min(2, zoom + 0.1))}>+</button>
          </div>
        </>
      }
    />
  );
}
