'use client';
import { useForm } from '@tanstack/react-form';
import { createRecipientSchema } from '@opensignflow/validation';
import { useCreateRecipientMutation } from './hooks';

export function useRecipientForm(documentId: string, onSuccess?: () => void) {
  const mutation = useCreateRecipientMutation(documentId);

  const form = useForm({
    defaultValues: { name: '', email: '', role: 'SIGNER' },
    onSubmit: async ({ value }) => {
      const parsed = createRecipientSchema.safeParse(value);
      if (!parsed.success) throw new Error('Recipient form is invalid.');
      await mutation.mutateAsync(parsed.data);
      form.reset();
      onSuccess?.();
    },
  });

  return { form, mutation };
}
