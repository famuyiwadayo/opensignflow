'use client';
import { useForm } from '@tanstack/react-form';
import { updateRecipientSchema } from '@opensignflow/validation';
import { SelectField } from '@/components/forms/select-field';
import { TextField } from '@/components/forms/text-field';
import { useUpdateRecipientMutation } from '../hooks';
export function RecipientEditForm({
  documentId,
  recipient,
  onSuccess,
}: {
  documentId: string;
  recipient: { id: string; name: string; email: string; role: string; signingOrder: number };
  onSuccess?: () => void;
}) {
  const mutation = useUpdateRecipientMutation(documentId);
  const form = useForm({
    defaultValues: {
      name: recipient.name,
      email: recipient.email,
      role: recipient.role,
      signingOrder: recipient.signingOrder,
    },

    onSubmit: async ({ value }) => {
      const parsed = updateRecipientSchema.safeParse(value);
      if (!parsed.success)
        throw new Error(parsed.error.issues[0]?.message ?? 'Recipient is invalid.');
      await mutation.mutateAsync({ id: recipient.id, body: parsed.data });
      onSuccess?.();
    },
  });
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-cyan-300">Edit</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="mt-3 grid gap-2"
      >
        <form.Field name="name">
          {(f) => <TextField label="Name" value={f.state.value} onChange={f.handleChange} />}
        </form.Field>
        <form.Field name="email">
          {(f) => (
            <TextField label="Email" type="email" value={f.state.value} onChange={f.handleChange} />
          )}
        </form.Field>
        <form.Field name="role">
          {(f) => (
            <SelectField
              label="Role"
              value={f.state.value}
              onChange={f.handleChange}
              options={[
                { value: 'SIGNER', label: 'Signer' },
                { value: 'CC', label: 'CC recipient' },
              ]}
            />
          )}
        </form.Field>
        <button
          disabled={mutation.isPending}
          className="rounded border border-cyan-300/40 p-2 text-sm text-cyan-200"
        >
          {mutation.isPending ? 'Saving…' : 'Save recipient'}
        </button>
      </form>
    </details>
  );
}
