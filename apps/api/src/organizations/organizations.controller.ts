import { Controller, Get, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards';
import {
  ApiOkDataResponse,
  type AuthenticatedUser,
  CurrentUser,
} from '@/common';
import { OrganizationMembershipEntity } from './entities';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List organizations/workspaces for the current user',
  })
  @ApiOkDataResponse(OrganizationMembershipEntity, { isArray: true })
  async listMyOrganizations(@CurrentUser() user: AuthenticatedUser) {
    const memberships = await this.orgService.listMembershipsForUser(user.id);

    return {
      data: memberships.map(OrganizationMembershipEntity.fromPrisma),
    };
  }
}
