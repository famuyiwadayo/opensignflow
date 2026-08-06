'use client';
import { useForm } from '@tanstack/react-form';
import { bulkFieldAssignmentSchema } from '@opensignflow/validation';
import { SelectField } from '@/components/forms/select-field';
import { useBulkAssignFieldsMutation } from '../hooks';
export function BulkAssignFieldsForm({
  documentId,
  fieldIds,
  signers,
  onSuccess,
}: {
  documentId: string;
  fieldIds: string[];
  signers: { id: string; name: string }[];
  onSuccess?: () => void;
}) {
  const mutation = useBulkAssignFieldsMutation(documentId);
  const form = useForm({
    defaultValues: { recipientId: '' },
    onSubmit: async ({ value }) => {
      const parsed = bulkFieldAssignmentSchema.safeParse({
        fieldIds,
        recipientId: value.recipientId,
      });
      if (!parsed.success)
        throw new Error(parsed.error.issues[0]?.message ?? 'Bulk assignment is invalid.');
      await mutation.mutateAsync(parsed.data);
      onSuccess?.();
    },
  });
  if (!fieldIds.length) return null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3"
    >
      <p className="mb-3 text-sm text-cyan-100">
        {fieldIds.length} field{fieldIds.length === 1 ? '' : 's'} selected
      </p>
      <form.Field
        name="recipientId"
        validators={{ onChange: ({ value }) => (value ? undefined : 'Select a signer.') }}
      >
        {(f) => (
          <SelectField
            label="Assign to signer"
            value={f.state.value}
            onChange={f.handleChange}
            options={[
              { value: '', label: 'Choose signer…' },
              ...signers.map((s) => ({ value: s.id, label: s.name })),
            ]}
            error={f.state.meta.errors[0] as string | undefined}
          />
        )}
      </form.Field>
      <button
        disabled={mutation.isPending}
        className="mt-3 rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950"
      >
        {mutation.isPending ? 'Assigning…' : 'Assign selected fields'}
      </button>
    </form>
  );
}
