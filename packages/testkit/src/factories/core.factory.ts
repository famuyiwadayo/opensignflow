import { ID_PREFIXES } from '@opensignflow/shared';

let sequence = 0;
function id(name: keyof typeof ID_PREFIXES) {
  sequence += 1;
  return `${ID_PREFIXES[name]}_test_${sequence}`;
}

export function userFactory(
  overrides: Partial<{ id: string; email: string; normalizedEmail: string; name: string }> = {},
) {
  const email = overrides.email ?? `user-${sequence + 1}@example.test`;
  return {
    id: overrides.id ?? id('user'),
    email,
    normalizedEmail: overrides.normalizedEmail ?? email.toLowerCase(),
    name: overrides.name ?? 'Test User',
  };
}

export function organizationFactory(
  overrides: Partial<{ id: string; name: string; slug: string }> = {},
) {
  return {
    id: overrides.id ?? id('organization'),
    name: overrides.name ?? 'Test Organization',
    slug: overrides.slug ?? `test-org-${sequence}`,
  };
}
