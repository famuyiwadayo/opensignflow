'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { ApiClientError, apiRequest } from '../../../lib/api/client';

type Field = {
  id: string;
  type: 'SIGNATURE' | 'INITIALS' | 'TEXT' | 'DATE' | 'CHECKBOX';
  pageNumber: number;
  required: boolean;
  label: string | null;
  placeholder: string | null;
};

type SigningRequest = {
  documentTitle: string;
  originalFileName: string;
  pageCount: number | null;
  recipientName: string;
  recipientEmail: string;
  status: string;
  expiresAt: string;
  fields: Field[];
};

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [request, setRequest] = useState<SigningRequest | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest<SigningRequest>(`/v1/signing-requests/${token}`),
      apiRequest<{ url: string }>(`/v1/signing-requests/${token}/document-url`),
    ])
      .then(([signing, document]) => {
        setRequest(signing.data);
        setDocumentUrl(document.data.url);
      })
      .catch((reason) => {
        if (reason instanceof ApiClientError && reason.error.code === 'SIGNING_ALREADY_SUBMITTED')
          setComplete(true);
        else
          setError(
            reason instanceof ApiClientError
              ? reason.error.message
              : 'Unable to load signing request.',
          );
      });
  }, [token]);

  const requiredMissing = useMemo(
    () => request?.fields.some((field) => field.required && !values[field.id]) ?? false,
    [request, values],
  );

  async function submit() {
    if (!request || requiredMissing) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/v1/signing-requests/${token}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          values: request.fields
            .filter((field) => values[field.id] !== undefined && values[field.id] !== '')
            .map((field) => ({
              fieldId: field.id,
              value:
                field.type === 'SIGNATURE'
                  ? { type: 'TYPED_NAME', name: String(values[field.id]) }
                  : values[field.id],
            })),
        }),
      });
      setComplete(true);
    } catch (reason) {
      setError(
        reason instanceof ApiClientError
          ? reason.error.message
          : 'Unable to submit signing request.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (error)
    return (
      <main style={styles.center}>
        <h1>Signing unavailable</h1>
        <p>{error}</p>
      </main>
    );

  if (complete)
    return (
      <main style={styles.center}>
        <h1>Signing complete</h1>
        <p>Thank you. Your signing step has been recorded.</p>
      </main>
    );

  if (!request)
    return (
      <main style={styles.center}>
        <p>Loading signing request…</p>
      </main>
    );

  return (
    <main style={styles.layout}>
      <section style={styles.document}>
        <h1>{request.documentTitle}</h1>
        <p style={styles.muted}>
          Signing as {request.recipientName} · Expires{' '}
          {new Date(request.expiresAt).toLocaleString()}
        </p>
        {documentUrl && (
          <iframe title={request.originalFileName} src={documentUrl} style={styles.frame} />
        )}
      </section>
      <aside style={styles.panel}>
        <h2>Complete your fields</h2>
        {request.fields.map((field) => (
          <label key={field.id} style={styles.field}>
            <span>
              {field.label ?? field.type}
              {field.required ? ' *' : ''}
            </span>
            {field.type === 'CHECKBOX' ? (
              <input
                type="checkbox"
                checked={Boolean(values[field.id])}
                onChange={(event) => setValues({ ...values, [field.id]: event.target.checked })}
              />
            ) : (
              <input
                type={field.type === 'DATE' ? 'date' : 'text'}
                placeholder={
                  field.placeholder ?? (field.type === 'SIGNATURE' ? 'Type your full name' : '')
                }
                value={String(values[field.id] ?? '')}
                onChange={(event) => setValues({ ...values, [field.id]: event.target.value })}
              />
            )}
          </label>
        ))}
        <button disabled={submitting || requiredMissing} onClick={submit} style={styles.button}>
          {submitting ? 'Submitting…' : 'Submit signing'}
        </button>
        {requiredMissing && (
          <p style={styles.warning}>Complete all required fields before submitting.</p>
        )}
      </aside>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 380px',
    gap: 24,
    padding: 32,
    minHeight: '100vh',
    background: 'transparent',
  },
  document: {
    background: 'rgba(15,23,42,.72)',
    color: '#f8fafc',
    padding: 28,
    borderRadius: 18,
    border: '1px solid rgba(125,211,252,.22)',
    boxShadow: '0 24px 70px rgba(0,0,0,.3)',
  },
  panel: {
    background: 'rgba(15,23,42,.84)',
    color: '#f8fafc',
    padding: 28,
    borderRadius: 18,
    border: '1px solid rgba(167,139,250,.24)',
    height: 'fit-content',
  },
  frame: {
    width: '100%',
    height: '75vh',
    border: '1px solid rgba(148,163,184,.3)',
    borderRadius: 12,
    marginTop: 22,
    background: '#fff',
  },
  field: { display: 'grid', gap: 8, margin: '18px 0', fontWeight: 600 },
  button: {
    width: '100%',
    padding: 14,
    border: 0,
    borderRadius: 10,
    background: '#67e8f9',
    color: '#082f49',
    cursor: 'pointer',
    fontWeight: 700,
  },
  center: { maxWidth: 560, margin: '15vh auto', textAlign: 'center', color: '#f8fafc' },
  muted: { color: '#94a3b8' },
  warning: { color: '#fda4af' },
};
