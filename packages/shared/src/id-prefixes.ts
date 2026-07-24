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
  aiAnalysis: 'ai',
  job: 'job',
  subscription: 'subsc',
  usageRecord: 'usg',
  idempotencyRecord: 'idem',
} as const;

export type IdPrefixName = keyof typeof ID_PREFIXES;
export type IdPrefix = (typeof ID_PREFIXES)[IdPrefixName];
