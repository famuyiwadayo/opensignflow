'use client';
import { useForm } from '@tanstack/react-form';
import { createDocumentFieldSchema } from '@opensignflow/validation';
import { useCreateFieldMutation } from './hooks';

export function useDocumentFieldForm(documentId: string, onSuccess?: () => void) {
  const mutation = useCreateFieldMutation(documentId);
  const form = useForm({
    defaultValues: {
      recipientId: '',
      type: 'SIGNATURE',
      pageNumber: 1,
      x: 0.1,
      y: 0.1,
      width: 0.28,
      height: 0.07,
      required: true,
    },

    onSubmit: async ({ value }) => {
      const parsed = createDocumentFieldSchema.safeParse(value);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Field is invalid.');
      await mutation.mutateAsync(parsed.data);
      form.reset();
      onSuccess?.();
    },
  });
  return { form, mutation };
}
