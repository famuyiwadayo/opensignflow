/* eslint-disable @typescript-eslint/no-explicit-any */
import { BulkAssignFieldsForm } from '@/features/document-fields/components/bulk-assign-fields-form';
import { RecipientForm } from '@/features/recipients/components/recipient-form';

export function EditorSidebar({
  documentId,
  recipients,
  fields,
  selectedFieldIds,
  currentPage,
  pageCount,
  onPageChange,
  onSelectField,
  onSuccess,
}: {
  documentId: string;
  recipients: any[];
  fields: any[];
  selectedFieldIds: string[];
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onSelectField: (id: string, selected: boolean) => void;
  onSuccess: () => void;
}) {
  const signers = recipients.filter((r) => r.role === 'SIGNER');
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Pages</h2>
        <div className="mt-3 grid gap-1">
          {Array.from({ length: pageCount }, (_, index) => {
            const page = index + 1;
            const count = fields.filter((f) => f.pageNumber === page).length;
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`flex justify-between rounded-lg px-3 py-2 text-sm ${page === currentPage ? 'bg-cyan-300/15 text-cyan-200' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <span>Page {page}</span>
                <span>{count} fields</span>
              </button>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Recipients
        </h2>
        <RecipientForm documentId={documentId} onSuccess={onSuccess} />
        <div className="mt-4 grid gap-2">
          {recipients.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-sm"
            >
              <strong>{r.name}</strong>
              <span className="block text-xs text-slate-400">
                {r.email} · {r.role}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Fields</h2>
        <div className="mt-3 grid gap-2">
          {fields.map((f) => (
            <label
              key={f.id}
              className="flex items-center gap-2 rounded border border-slate-800 p-2 text-xs"
            >
              <input
                type="checkbox"
                checked={selectedFieldIds.includes(f.id)}
                onChange={(e) => onSelectField(f.id, e.target.checked)}
              />
              <span>
                {f.label ?? f.type} · p{f.pageNumber}
              </span>
            </label>
          ))}
        </div>
        <BulkAssignFieldsForm
          documentId={documentId}
          fieldIds={selectedFieldIds}
          signers={signers}
          onSuccess={onSuccess}
        />
      </section>
    </div>
  );
}
