import Link from 'next/link';
import { ArrowRight, FileSignature, ShieldCheck, Workflow } from 'lucide-react';

const workflow = [
  [
    '01',
    'Prepare with precision.',
    'Upload a PDF, define recipients, and place signing fields directly on the document.',
  ],
  [
    '02',
    'Send with confidence.',
    'Every signing request has a unique token, delivery job, and durable audit trail.',
  ],
  [
    '03',
    'Keep every step visible.',
    'Watch recipient activity, job progress, finalization, and completed document state.',
  ],
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-[1340px] border-x border-slate-800/80">
      <nav className="flex h-16 items-center justify-between border-b border-slate-800 px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <FileSignature size={18} className="text-cyan-300" />
          OpenSignFlow
        </Link>
        <div className="flex items-center gap-5 os-mono">
          <a href="#workflow">WORKFLOW</a>
          <Link href="/auth/login">LOG IN</Link>
          <Link href="/auth/register" className="os-button-secondary">
            START
          </Link>
        </div>
      </nav>
      <section className="grid min-h-[590px] grid-cols-1 border-b border-slate-800 lg:grid-cols-[1.15fr_.85fr]">
        <div className="p-8 lg:p-12">
          <p className="os-eyebrow">THE DOCUMENT WORKFLOW STUDIO</p>
          <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[.95] tracking-[-.06em] sm:text-7xl">
            Sign{' '}
            <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">
              confidently.
            </span>
            <br />
            Keep every step visible.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-300">
            OpenSignFlow is an open-source signing workflow for teams that need secure requests,
            visible progress, auditable actions, and completed PDF records.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/auth/register" className="os-button-primary">
              Start a workflow <ArrowRight className="ml-2 inline" size={16} />
            </Link>
            <Link href="/app" className="os-button-secondary">
              Open workspace
            </Link>
          </div>
          <p className="mt-8 os-mono">OPEN SOURCE · PRIVATE STORAGE · AUDIT FIRST</p>
        </div>
        <div className="relative overflow-hidden border-t border-slate-800 p-8 lg:border-l lg:border-t-0">
          <div className="absolute -right-16 top-10 h-80 w-80 rounded-full border-[42px] border-violet-400/10" />
          <div className="relative mt-16 border border-violet-300/30 bg-[#11131a] p-5 shadow-2xl">
            <div className="flex items-center justify-between os-mono">
              <span>EMPLOYMENT_CONTRACT.PDF</span>
              <span className="text-emerald-300">DRAFT</span>
            </div>
            <div className="mt-5 h-52 border border-slate-700 bg-gradient-to-br from-slate-100 to-slate-300 p-5 text-slate-950">
              <div className="h-4 w-2/3 bg-slate-400" />
              <div className="mt-4 h-2 w-full bg-slate-300" />
              <div className="mt-2 h-2 w-5/6 bg-slate-300" />
              <div className="mt-10 ml-auto h-10 w-32 border-2 border-cyan-400 bg-cyan-300/30" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 os-mono">
              <span>1 SIGNER</span>
              <span>1 FIELD</span>
              <span>READY</span>
            </div>
          </div>
        </div>
      </section>
      <section className="grid border-b border-slate-800 sm:grid-cols-3">
        <Metric value="PRIVATE" label="OBJECT STORAGE" />
        <Metric value="AUDITED" label="WORKFLOW EVENTS" />
        <Metric value="ASYNC" label="FINALIZATION JOBS" />
      </section>
      <section id="workflow" className="divide-y divide-slate-800">
        {workflow.map(([number, title, body]) => (
          <div key={number} className="grid gap-8 p-8 sm:grid-cols-[120px_1fr_.75fr] lg:p-12">
            <span className="text-5xl font-black tracking-[-.08em] text-slate-800">{number}</span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {title} <ArrowRight className="inline text-violet-300" size={18} />
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-slate-300">{body}</p>
            </div>
            <div className="os-surface p-5">
              <Workflow size={20} className="text-cyan-300" />
              <p className="mt-6 os-mono">WORKFLOW STATUS</p>
              <p className="mt-2 text-sm text-slate-300">
                Durable actions, encrypted delivery intents, and visible completion state.
              </p>
            </div>
          </div>
        ))}
      </section>
      <section className="grid min-h-[380px] border-b border-slate-800 p-8 lg:grid-cols-[1fr_.8fr] lg:p-12">
        <div>
          <p className="os-eyebrow">A CLEARER RECORD</p>
          <h2 className="mt-5 max-w-xl text-5xl font-black leading-[.95] tracking-[-.06em]">
            Documents deserve a visible lifecycle.
          </h2>
          <p className="mt-6 max-w-xl leading-7 text-slate-300">
            From first upload to final PDF, OpenSignFlow keeps the workflow structured, private, and
            observable.
          </p>
        </div>
        <div className="flex items-center justify-center">
          <ShieldCheck size={180} className="text-violet-400/15" />
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-4 p-6 os-mono">
        <span>OPEN SIGN FLOW · OPEN SOURCE DOCUMENT WORKFLOW</span>
        <span>BUILT FOR MODERN TEAMS</span>
      </footer>
    </main>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-b border-slate-800 p-7 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <strong className="text-3xl font-black tracking-[-.04em]">{value}</strong>
      <p className="mt-2 os-mono">{label}</p>
    </div>
  );
}
