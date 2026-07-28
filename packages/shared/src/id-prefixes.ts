/** Stable public-ID prefixes. Callers use the semantic key, never the raw prefix. */
export const ID_PREFIXES = {
  user: 'usr',
  organization: 'org',
  organizationMember: 'mem',
  userSession: 'ses',
  document: 'doc',
  documentField: 'fld',
  recipient: 'rcp',
  signingRequest: 'sreq',
  signingSubmission: 'ssub',
  auditEvent: 'aud',
  outboxEvent: 'obx',
  aiAnalysis: 'ai',
  job: 'job',
  subscription: 'subsc',
  usageRecord: 'usg',
  idempotencyRecord: 'idem',
} as const;

export type IdPrefixName = keyof typeof ID_PREFIXES;
export type IdPrefix = (typeof ID_PREFIXES)[IdPrefixName];
