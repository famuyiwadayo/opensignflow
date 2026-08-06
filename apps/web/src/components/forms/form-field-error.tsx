export function FormFieldError({ error }: { error?: string }) {
  return error ? (
    <small role="alert" className="text-sm text-rose-300">
      {error}
    </small>
  ) : null;
}
