import { ApiProperty } from '@nestjs/swagger';
import { ProcessingStatus } from '@opensignflow/database';

export class JobEntity {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ProcessingStatus }) status!: ProcessingStatus;
  @ApiProperty() resourceType!: string | null;
  @ApiProperty() resourceId!: string | null;
  @ApiProperty() progressPercent!: number;
  @ApiProperty({ nullable: true }) progressPhase!: string | null;
  @ApiProperty({ nullable: true }) progressMessage!: string | null;
  @ApiProperty({ nullable: true }) completedAt!: string | null;
  @ApiProperty() createdAt!: string;

  static fromPrisma(job: any): JobEntity {
    return {
      id: job.id,
      status: job.status,
      resourceType: job.resourceType,
      resourceId: job.resourceId,
      progressPercent: job.progressPercent,
      progressPhase: job.progressPhase,
      progressMessage: job.progressMessage,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
    };
  }
}
