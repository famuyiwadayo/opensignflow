import Link from 'next/link';
import { ArrowRight, BrainCircuit, FileSignature, ShieldCheck } from 'lucide-react';

import { Button } from '../components/ui/button';
import { ApiStatusCard } from '../features/health/api-status-card';

const features = [
  {
    icon: FileSignature,
    title: 'Prepare and sign PDFs',
    description:
      'Upload PDFs, place fields, send secure signing links, and generate completed documents.',
  },
  {
    icon: BrainCircuit,
    title: 'AI-assisted workflows',
    description:
      'Summarize documents, suggest signing fields, and draft signer emails from extracted PDF text.',
  },
  {
    icon: ShieldCheck,
    title: 'Auditability first',
    description:
      'Track document events, signer activity, timestamps, IP addresses, and final PDF hashes.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 md:py-24">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            OpenSignFlow
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Log in
            </Link>
            <Link href="/app">
              <Button>Dashboard</Button>
            </Link>
          </div>
        </nav>

        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border bg-white px-3 py-1 text-sm text-muted-foreground shadow-sm">
              Open-source AI-assisted PDF signing platform
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
                Prepare, send, sign, and manage PDFs with AI-assisted workflows.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                A production-style SaaS portfolio project built with Turborepo, Next.js, NestJS,
                PostgreSQL, Redis, S3-compatible storage, and a standardized REST contract.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/register">
                <Button className="w-full sm:w-auto">
                  Start building <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/app">
                <Button variant="secondary" className="w-full sm:w-auto">
                  View dashboard shell
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <ApiStatusCard />
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">MVP focus</p>
              <p className="mt-2 text-2xl font-semibold">Upload → Prepare → Send → Sign → Audit</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border bg-white p-6 shadow-sm">
              <feature.icon className="h-6 w-6" />
              <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
