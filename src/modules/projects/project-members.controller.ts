import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import type { Request } from 'express';

import { ProjectMembersService } from './project-members.service.js';

import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ProjectPermissionsGuard } from './guards/project-permissions.guard.js';
import { ProjectAccessGuard } from './guards/project-access.guard.js';
import { ProjectPermission } from './enums/project-permission.enum.js';
import { ProjectPermissions } from './decorators/project-permissions.decorator.js';
interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

@ApiTags('Project Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard, ProjectPermissionsGuard)
@Controller('organizations/:organizationId/projects/:projectId')
export class ProjectMembersController {
  constructor(private readonly projectMembersService: ProjectMembersService) {}

  @Get('members')
  @ApiOperation({
    summary: 'Get project members',
  })
  findAll(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('projectId', ParseUUIDPipe)
    projectId: string,

    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectMembersService.findAll(organizationId, projectId, req.user.sub);
  }

  @Get('eligible-members')
  @ProjectPermissions(ProjectPermission.MANAGE_MEMBERS)
  @ApiOperation({
    summary: 'Get eligible organization members',
  })
  findEligibleMembers(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('projectId', ParseUUIDPipe)
    projectId: string,

    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectMembersService.findEligibleMembers(organizationId, projectId, req.user.sub);
  }

  @Post('members')
  @ApiOperation({
    summary: 'Add project member',
  })
  create(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('projectId', ParseUUIDPipe)
    projectId: string,

    @Body() dto: AddProjectMemberDto,

    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectMembersService.create(organizationId, projectId, dto, req.user.sub);
  }

  @Patch('members/:memberId')
  @ApiOperation({
    summary: 'Update project member role',
  })
  updateRole(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('projectId', ParseUUIDPipe)
    projectId: string,

    @Param('memberId', ParseUUIDPipe)
    memberId: string,

    @Body() dto: UpdateProjectMemberDto,

    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectMembersService.updateRole(
      organizationId,
      projectId,
      memberId,
      dto,
      req.user.sub,
    );
  }

  @Delete('members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove project member',
  })
  remove(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('projectId', ParseUUIDPipe)
    projectId: string,

    @Param('memberId', ParseUUIDPipe)
    memberId: string,

    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectMembersService.remove(organizationId, projectId, memberId, req.user.sub);
  }
}
