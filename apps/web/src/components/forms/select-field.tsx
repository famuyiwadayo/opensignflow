import { FormFieldError } from './form-field-error';

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border bg-slate-900 p-3"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FormFieldError error={error} />
    </label>
  );
}
