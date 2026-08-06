'use client';
import { SelectField } from '@/components/forms/select-field';
import { TextField } from '@/components/forms/text-field';
import { useRecipientForm } from '../use-recipient-form';

export function RecipientForm({
  documentId,
  onSuccess,
}: {
  documentId: string;
  onSuccess?: () => void;
}) {
  const { form, mutation } = useRecipientForm(documentId, onSuccess);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="mt-5 grid gap-3"
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) =>
            value.trim().length >= 2 ? undefined : 'Name must be at least 2 characters.',
        }}
      >
        {(f) => (
          <TextField
            label="Name"
            value={f.state.value}
            onChange={f.handleChange}
            error={f.state.meta.errors[0] as string | undefined}
            required
          />
        )}
      </form.Field>

      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : 'Enter a valid email address.',
        }}
      >
        {(f) => (
          <TextField
            label="Email"
            type="email"
            value={f.state.value}
            onChange={f.handleChange}
            error={f.state.meta.errors[0] as string | undefined}
            required
          />
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
        className="rounded-lg bg-cyan-300 p-3 font-semibold text-slate-950"
      >
        {mutation.isPending ? 'Adding…' : 'Add recipient'}
      </button>
    </form>
  );
}
