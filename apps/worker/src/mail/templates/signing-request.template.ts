export type SigningRequestTemplateInput = {
  recipientName: string;
  documentTitle: string;
  signingUrl: string;
};
export function signingRequestTemplate(input: SigningRequestTemplateInput) {
  const text = `Hello ${input.recipientName},\n\n${input.documentTitle} is ready for your signature: ${input.signingUrl}`;
  return {
    subject: `Signature requested: ${input.documentTitle}`,
    text,
    html: `<p>Hello ${input.recipientName},</p><p><strong>${input.documentTitle}</strong> is ready for your signature.</p><p><a href="${input.signingUrl}">Review and sign document</a></p>`,
  };
}
