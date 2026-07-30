import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { apiError, ErrorCode } from '@/common';
import type { OrganizationsRepository } from './organizations.repository';

@Injectable()
export class OrganizationsService {
  constructor(private readonly orgRepo: OrganizationsRepository) {}

  createPersonalWorkspaceName(input: {
    name?: string | null;
    email: string;
  }): string {
    const baseName =
      input.name?.trim() || input.email.split('@')[0] || 'Personal';
    return `${baseName}'s Workspace`;
  }

  listMembershipsForUser(userId: string) {
    return this.orgRepo.listMembershipsForUser(userId);
  }

  async resolveActiveMembershipForUser(input: {
    userId: string;
    organizationId?: string;
  }) {
    if (input.organizationId) {
      const membership = await this.orgRepo.findMembershipForUser({
        userId: input.userId,
        organizationId: input.organizationId,
      });

      if (!membership) {
        throw new NotFoundException(
          apiError(
            ErrorCode.ORGANIZATION_NOT_FOUND,
            'Organization was not found.',
          ),
        );
      }

      return membership;
    }

    const memberships = await this.orgRepo.listMembershipsForUser(input.userId);

    if (memberships.length === 1) {
      return memberships[0];
    }

    throw new BadRequestException(
      apiError(
        ErrorCode.ORGANIZATION_REQUIRED,
        'Organization scope is required.',
      ),
    );
  }
}
