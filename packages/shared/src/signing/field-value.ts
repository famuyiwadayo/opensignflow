export const SignatureValueType = { TYPED_NAME: 'TYPED_NAME' } as const;
export type TypedNameSignatureValue = { type: typeof SignatureValueType.TYPED_NAME; name: string };
export type SigningFieldValue = string | boolean | TypedNameSignatureValue;

export function isTypedNameSignatureValue(value: unknown): value is TypedNameSignatureValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const typedValue = value as Record<string, unknown>;
  const name = typedValue.name;

  return (
    typedValue.type === SignatureValueType.TYPED_NAME &&
    typeof name === 'string' &&
    name.trim().length > 0 &&
    name.length <= 120
  );
}
