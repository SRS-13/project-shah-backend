import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import type { Request } from 'express';

import { ProjectsService } from './projects.service.js';

import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectQueryDto } from './dto/project-query.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ProjectAccessGuard } from './guards/project-access.guard.js';

import { ProjectPermissionsGuard } from './guards/project-permissions.guard.js';

import { ProjectPermissions } from './decorators/project-permissions.decorator.js';

import { ProjectPermission } from './enums/project-permission.enum.js';
import { CurrentProjectAccess } from './decorators/current-project-access.decorator.js';
import { ProjectAccess } from './interfaces/project-access.interface.js';

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create project' })
  create(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Body() dto: CreateProjectDto,

    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectsService.create(organizationId, dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get organization projects' })
  findAll(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Query() query: ProjectQueryDto,

    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectsService.findAll(organizationId, req.user.sub, query);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get project details' })
  @UseGuards(ProjectAccessGuard, ProjectPermissionsGuard)
  @ProjectPermissions(ProjectPermission.VIEW_PROJECT)
  findOne(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('projectId', ParseUUIDPipe)
    projectId: string,

    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectsService.findOne(organizationId, projectId, req.user.sub);
  }

  @Patch(':projectId')
  @UseGuards(ProjectAccessGuard, ProjectPermissionsGuard)
  @ProjectPermissions(ProjectPermission.UPDATE_PROJECT)
  @ApiOperation({ summary: 'Update project' })
  update(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('projectId', ParseUUIDPipe)
    projectId: string,

    @Body() dto: UpdateProjectDto,

    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectsService.update(organizationId, projectId, dto, req.user.sub);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ProjectAccessGuard, ProjectPermissionsGuard)
  @ProjectPermissions(ProjectPermission.DELETE_PROJECT)
  @ApiOperation({ summary: 'Archive project' })
  remove(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('projectId', ParseUUIDPipe)
    projectId: string,

    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectsService.remove(organizationId, projectId, req.user.sub);
  }

  @Post(':projectId/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore archived project' })
  restore(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('projectId', ParseUUIDPipe)
    projectId: string,

    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectsService.restore(organizationId, projectId, req.user.sub);
  }

  @Get(':projectId/permissions')
  @UseGuards(ProjectAccessGuard, ProjectPermissionsGuard)
  @ProjectPermissions(ProjectPermission.VIEW_PROJECT)
  @ApiOperation({
    summary: 'Get current user project permissions',
  })
  getPermissions(
    @CurrentProjectAccess()
    access: ProjectAccess,
  ) {
    return {
      projectId: access.project.id,

      organizationId: access.project.organizationId,

      organizationRole: access.organizationMember.role,

      projectRole: access.projectMember?.role ?? null,

      isAdmin: access.isAdmin,

      permissions: access.permissions,
    };
  }
}
