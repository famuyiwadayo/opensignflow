import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { apiError, ErrorCode, type AuthenticatedUser } from '../common';
import { PrismaService } from '@/database';
import { OrganizationsService } from '@/organizations';
import { JobEntity } from './entities/job.entity';

@Injectable()
export class JobsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationsService)
    private readonly organizations: OrganizationsService,
  ) {}

  async get(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    jobId: string;
  }) {
    const membership = await this.organizations.resolveActiveMembershipForUser({
      userId: input.user.id,
      organizationId: input.organizationId,
    });
    const job = await this.prisma.jobRecord.findFirst({
      where: { id: input.jobId, organizationId: membership.organization.id },
    });
    if (!job) {
      throw new NotFoundException(
        apiError(ErrorCode.JOB_NOT_FOUND, 'Job was not found.'),
      );
    }
    return JobEntity.fromPrisma(job);
  }

  async listForDocument(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
  }) {
    const membership = await this.organizations.resolveActiveMembershipForUser({
      userId: input.user.id,
      organizationId: input.organizationId,
    });
    const jobs = await this.prisma.jobRecord.findMany({
      where: {
        organizationId: membership.organization.id,
        resourceType: 'DOCUMENT',
        resourceId: input.documentId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map(JobEntity.fromPrisma);
  }
}
