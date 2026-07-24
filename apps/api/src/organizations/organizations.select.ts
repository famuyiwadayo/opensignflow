import { Prisma } from '~/prisma/generated/client';

export const organizationPublicSelect = {
  id: true,
  name: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganizationSelect;

export type OrganizationPublicRecord = Prisma.OrganizationGetPayload<{
  select: typeof organizationPublicSelect;
}>;

export const organizationMembershipSelect = {
  id: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  organization: {
    select: organizationPublicSelect,
  },
} satisfies Prisma.OrganizationMemberSelect;

export type OrganizationMembershipRecord = Prisma.OrganizationMemberGetPayload<{
  select: typeof organizationMembershipSelect;
}>;
