import { Injectable } from '@nestjs/common';

import { IdGeneratorService } from '@/common';
import { OrganizationsRepository } from './organizations.repository';

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
}
