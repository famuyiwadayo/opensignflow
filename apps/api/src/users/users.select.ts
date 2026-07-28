import { Prisma } from '@opensignflow/database';

export const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserPublicRecord = Prisma.UserGetPayload<{
  select: typeof userPublicSelect;
}>;

export const userAuthSelect = {
  id: true,
  email: true,
  normalizedEmail: true,
  name: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserAuthRecord = Prisma.UserGetPayload<{
  select: typeof userAuthSelect;
}>;
