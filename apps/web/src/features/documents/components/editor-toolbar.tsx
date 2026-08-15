import Link from 'next/link';

export function EditorToolbar({
  title,
  status,
  onSend,
  sending,
}: {
  title: string;
  status: string;
  onSend: () => void;
  sending: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-4">
        <Link
          href="/app"
          className="grid h-8 w-8 place-items-center rounded bg-cyan-300 text-sm font-black text-slate-950"
        >
          ⌁
        </Link>
        <span className="h-6 border-l border-slate-700" />
        <div>
          <p className="os-mono">DOCUMENT EDITOR</p>
          <h1 className="text-base font-semibold text-slate-100">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`os-status ${status === 'DRAFT' ? 'border-amber-300/30 text-amber-300' : status === 'COMPLETED' ? 'border-emerald-300/30 text-emerald-300' : 'border-cyan-300/30 text-cyan-200'}`}
        >
          {status}
        </span>
        <button
          disabled={sending || status !== 'DRAFT'}
          onClick={onSend}
          className="os-button-primary"
        >
          {sending ? 'Sending…' : 'Send document'}
        </button>
      </div>
    </>
  );
}
