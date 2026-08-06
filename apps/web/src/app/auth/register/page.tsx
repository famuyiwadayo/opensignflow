'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import { ApiClientError } from '@/lib/api/client';
import { useRegisterMutation } from '@/features/auth/use-auth-mutations';

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegisterMutation();

  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    onSubmit: async ({ value }) => {
      await register.mutateAsync(value);
      router.push('/app');
    },
  });

  const text = (value: string, min: number, label: string) =>
    value.trim().length >= min ? undefined : `${label} must be at least ${min} characters.`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="w-full max-w-md rounded-2xl border bg-slate-950/80 p-8 shadow-2xl"
      >
        <Link href="/">← Back home</Link>
        <h1 className="mt-6 text-2xl font-bold">Create your workspace</h1>
        <div className="mt-6 space-y-4">
          <form.Field name="name" validators={{ onChange: ({ value }) => text(value, 2, 'Name') }}>
            {(field) => (
              <label className="grid gap-2">
                <span>Name</span>
                <input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="rounded border bg-slate-900 p-3"
                />
                {field.state.meta.errors[0] && (
                  <small className="text-red-300">{String(field.state.meta.errors[0])}</small>
                )}
              </label>
            )}
          </form.Field>
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) =>
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                  ? undefined
                  : 'Enter a valid email address.',
            }}
          >
            {(field) => (
              <label className="grid gap-2">
                <span>Email</span>
                <input
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="rounded border bg-slate-900 p-3"
                />
                {field.state.meta.errors[0] && (
                  <small className="text-red-300">{String(field.state.meta.errors[0])}</small>
                )}
              </label>
            )}
          </form.Field>
          <form.Field
            name="password"
            validators={{ onChange: ({ value }) => text(value, 8, 'Password') }}
          >
            {(field) => (
              <label className="grid gap-2">
                <span>Password</span>
                <input
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="rounded border bg-slate-900 p-3"
                />
                {field.state.meta.errors[0] && (
                  <small className="text-red-300">{String(field.state.meta.errors[0])}</small>
                )}
              </label>
            )}
          </form.Field>
          <button
            disabled={register.isPending}
            className="w-full rounded bg-cyan-300 p-3 font-semibold text-slate-950"
          >
            {register.isPending ? 'Creating workspace…' : 'Create workspace'}
          </button>
          {register.error && (
            <p className="text-sm text-red-300">
              {register.error instanceof ApiClientError
                ? register.error.error.message
                : 'Unable to register.'}
            </p>
          )}
        </div>
        <p className="mt-6 text-sm">
          Already have an account? <Link href="/auth/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}
