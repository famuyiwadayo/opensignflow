'use client';
import { useForm } from '@tanstack/react-form';
import { useCreateRecipientMutation } from './hooks';

export function useRecipientForm(documentId: string, onSuccess?: () => void) {
  const mutation = useCreateRecipientMutation(documentId);

  const form = useForm({
    defaultValues: { name: '', email: '', role: 'SIGNER' },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
      form.reset();
      onSuccess?.();
    },
  });
  return { form, mutation };
}
