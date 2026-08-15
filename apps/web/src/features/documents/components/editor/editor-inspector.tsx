/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { DocumentFieldEditForm } from '@/features/document-fields/components/document-field-edit-form';
import { useDeleteFieldMutation } from '@/features/document-fields/hooks';

export function EditorInspector({
  field,
  documentId,
  signers,
  onDeleted,
}: {
  field: any;
  documentId: string;
  signers: { id: string; name: string }[];
  onDeleted: () => void;
}) {
  const remove = useDeleteFieldMutation(documentId);
  if (!field)
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Inspector</h2>
        <p className="mt-4 text-sm text-slate-500">
          Select a field on the PDF to edit its properties.
        </p>
      </div>
    );
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
        Selected field
      </h2>
      <p className="mt-3 text-lg font-semibold">{field.label ?? field.type}</p>
      <p className="text-sm text-slate-400">Page {field.pageNumber}</p>
      <DocumentFieldEditForm documentId={documentId} field={field} signers={signers} />
      <button
        disabled={remove.isPending}
        onClick={() => remove.mutate(field.id, { onSuccess: onDeleted })}
        className="mt-5 rounded-lg border border-rose-400/40 px-3 py-2 text-sm text-rose-300"
      >
        {remove.isPending ? 'Removing…' : 'Delete field'}
      </button>
    </div>
  );
}
