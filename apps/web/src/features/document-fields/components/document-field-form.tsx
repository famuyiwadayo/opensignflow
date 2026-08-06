'use client';
import { SelectField } from '@/components/forms/select-field';
import { useDocumentFieldForm } from '../use-document-field-form';

export function DocumentFieldForm({
  documentId,
  signers,
  onSuccess,
}: {
  documentId: string;
  signers: { id: string; name: string }[];
  onSuccess?: () => void;
}) {
  const { form, mutation } = useDocumentFieldForm(documentId, onSuccess);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="mt-5 grid gap-3"
    >
      <form.Field
        name="recipientId"
        validators={{ onChange: ({ value }) => (value ? undefined : 'Select a signer.') }}
      >
        {(f) => (
          <SelectField
            label="Signer"
            value={f.state.value}
            onChange={f.handleChange}
            options={[
              { value: '', label: 'Assign signer…' },
              ...signers.map((s) => ({ value: s.id, label: s.name })),
            ]}
            error={f.state.meta.errors[0] as string | undefined}
          />
        )}
      </form.Field>

      <form.Field name="type">
        {(f) => (
          <SelectField
            label="Field type"
            value={f.state.value}
            onChange={f.handleChange}
            options={['SIGNATURE', 'INITIALS', 'TEXT', 'DATE', 'CHECKBOX'].map((value) => ({
              value,
              label: value[0] + value.slice(1).toLowerCase(),
            }))}
          />
        )}
      </form.Field>

      <button
        disabled={mutation.isPending || !signers.length}
        className="rounded-lg border border-cyan-300/40 p-3 text-cyan-200"
      >
        {mutation.isPending ? 'Adding…' : 'Add field'}
      </button>
    </form>
  );
}
