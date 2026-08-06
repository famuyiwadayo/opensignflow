'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import { ApiClientError } from '@/lib/api/client';
import { useLoginMutation } from '@/features/auth/use-auth-mutations';

export default function LoginPage() {
  const router = useRouter();
  const login = useLoginMutation();

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      await login.mutateAsync(value);
      router.push('/app');
    },
  });

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
        <h1 className="mt-6 text-2xl font-bold">Log in</h1>
        <div className="mt-6 space-y-4">
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
                  onBlur={field.handleBlur}
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
            validators={{
              onChange: ({ value }) => (value.length ? undefined : 'Password is required.'),
            }}
          >
            {(field) => (
              <label className="grid gap-2">
                <span>Password</span>
                <input
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
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
            disabled={login.isPending}
            className="w-full rounded bg-cyan-300 p-3 font-semibold text-slate-950"
          >
            {login.isPending ? 'Logging in…' : 'Log in'}
          </button>
          {login.error && (
            <p className="text-sm text-red-300">
              {login.error instanceof ApiClientError
                ? login.error.error.message
                : 'Unable to log in.'}
            </p>
          )}
        </div>
        <p className="mt-6 text-sm">
          No account? <Link href="/auth/register">Register</Link>
        </p>
      </form>
    </main>
  );
}
