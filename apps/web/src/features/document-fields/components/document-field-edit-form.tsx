/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useForm } from '@tanstack/react-form';
import { SelectField } from '@/components/forms/select-field';
import { TextField } from '@/components/forms/text-field';
import { useUpdateFieldMutation } from '../hooks';
export function DocumentFieldEditForm({
  documentId,
  field,
  signers,
  onSuccess,
}: {
  documentId: string;
  field: any;
  signers: { id: string; name: string }[];
  onSuccess?: () => void;
}) {
  const mutation = useUpdateFieldMutation(documentId);
  const form = useForm({
    defaultValues: {
      recipientId: field.recipientId ?? '',
      type: field.type,
      label: field.label ?? '',
      required: field.required,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ id: field.id, body: value });
      onSuccess?.();
    },
  });
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-cyan-300">Edit field</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="mt-3 grid gap-2"
      >
        <form.Field name="recipientId">
          {(f) => (
            <SelectField
              label="Signer"
              value={f.state.value}
              onChange={f.handleChange}
              options={[
                { value: '', label: 'Assign signer…' },
                ...signers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          )}
        </form.Field>
        <form.Field name="label">
          {(f) => <TextField label="Label" value={f.state.value} onChange={f.handleChange} />}
        </form.Field>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.state.values.required}
            onChange={(e) => form.setFieldValue('required', e.target.checked)}
          />
          Required field
        </label>
        <button
          disabled={mutation.isPending}
          className="rounded border border-cyan-300/40 p-2 text-sm text-cyan-200"
        >
          {mutation.isPending ? 'Saving…' : 'Save field'}
        </button>
      </form>
    </details>
  );
}
