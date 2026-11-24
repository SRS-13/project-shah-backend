import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { OrganizationsService } from './organizations.service.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { AddMemberDto } from './dto/add-member.dto.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { OrganizationRolesGuard } from './guards/organization-roles.guard.js';
import { OrganizationRole } from './entities/organization-member.entity.js';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto.js';
import { OrganizationRoles } from './decorators/organization-roles.decorator.js';

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationRolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  create(@Body() dto: CreateOrganizationDto, @Req() req: AuthenticatedRequest) {
    return this.organizationsService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get my organizations' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.organizationsService.findAll(req.user.sub);
  }

  @Get(':id/members')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MEMBER)
  @ApiOperation({ summary: 'Get organization members' })
  findMembers(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.organizationsService.findMembers(id, req.user.sub);
  }

  @Get(':id')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MEMBER)
  @ApiOperation({ summary: 'Get organization details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.organizationsService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Update organization' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.organizationsService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @OrganizationRoles(OrganizationRole.OWNER)
  @ApiOperation({ summary: 'Delete organization' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.organizationsService.remove(id, req.user.sub);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add existing user to organization' })
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.organizationsService.addMember(id, dto, req.user.sub);
  }

  @Patch(':id/members/:memberId')
  @OrganizationRoles(OrganizationRole.OWNER)
  @ApiOperation({ summary: 'Change organization member role' })
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.organizationsService.updateMemberRole(id, memberId, dto, req.user.sub);
  }

  @Delete(':id/members/:memberId')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Remove organization member' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.organizationsService.removeMember(id, memberId, req.user.sub);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave organization' })
  leaveOrganization(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.organizationsService.leaveOrganization(id, req.user.sub);
  }

  @Post(':id/invitations')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Create organization invitation' })
  createInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInvitationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.organizationsService.createInvitation(id, dto, req.user.sub);
  }

  @Get(':id/invitations')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'List organization invitations' })
  findInvitations(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.organizationsService.findInvitations(id, req.user.sub);
  }

  @Delete(':id/invitations/:invitationId')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Revoke organization invitation' })
  revokeInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.organizationsService.revokeInvitation(id, invitationId, req.user.sub);
  }

  @Post(':id/transfer-ownership')
  @HttpCode(HttpStatus.OK)
  @OrganizationRoles(OrganizationRole.OWNER)
  @ApiOperation({
    summary: 'Transfer organization ownership',
  })
  transferOwnership(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOwnershipDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.organizationsService.transferOwnership(id, dto.newOwnerId, req.user.sub);
  }

  @Post(':id/invitations/:invitationId/regenerate')
@HttpCode(HttpStatus.OK)
@OrganizationRoles(
  OrganizationRole.OWNER,
  OrganizationRole.ADMIN,
)
@ApiOperation({
  summary: 'Regenerate organization invitation link',
})
regenerateInvitation(
  @Param('id', ParseUUIDPipe) id: string,
  @Param('invitationId', ParseUUIDPipe) invitationId: string,
  @Req() req: AuthenticatedRequest,
) {
  return this.organizationsService.regenerateInvitation(
    id,
    invitationId,
    req.user.sub,
  );
}
}
