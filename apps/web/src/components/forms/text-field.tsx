import { FormFieldError } from './form-field-error';

export function TextField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-medium">
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border bg-slate-900 p-3"
      />
      {<FormFieldError error={error} />}
    </label>
  );
}
