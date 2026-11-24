import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import {
  DataSource,
  type EntityManager,
} from 'typeorm';

import { Project } from '../entities/project.entity.js';

import { ProjectMember } from
  '../entities/project-member.entity.js';

import {
  OrganizationMember,
  OrganizationRole,
} from '../../organizations/entities/organization-member.entity.js';

import { ProjectRole } from '../enums/project-role.enum.js';

import { ProjectPermission } from
  '../enums/project-permission.enum.js';

import {
  PROJECT_ROLE_PERMISSIONS,
  ORGANIZATION_ADMIN_PERMISSIONS,
} from '../constants/project-permissions.constant.js';

import type { ProjectAccess } from
  '../interfaces/project-access.interface.js';

@Injectable()
export class ProjectAccessService {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async getAccess(
    organizationId: string,
    projectId: string,
    userId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<ProjectAccess> {
    const organizationMember = await manager.findOne(
      OrganizationMember,
      {
        where: {
          organizationId,
          userId,
        },
      },
    );

    if (!organizationMember) {
      throw new NotFoundException(
        'Organization not found',
      );
    }

    const project = await manager.findOne(Project, {
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    const projectMember = await manager.findOne(
      ProjectMember,
      {
        where: {
          projectId,
          userId,
        },
      },
    );

    const isAdmin =
      organizationMember.role === OrganizationRole.OWNER ||
      organizationMember.role === OrganizationRole.ADMIN;

    if (!isAdmin && !projectMember) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    const permissions = isAdmin
      ? ORGANIZATION_ADMIN_PERMISSIONS
      : projectMember
        ? PROJECT_ROLE_PERMISSIONS[projectMember.role] ?? []
        : [];

    return {
      project,
      organizationMember,
      projectMember,
      isAdmin,
      canManage:
        isAdmin ||
        projectMember?.role === ProjectRole.MANAGER,
      permissions,
    };
  }

  hasPermission(
    access: ProjectAccess,
    permission: ProjectPermission,
  ): boolean {
    return access.permissions.includes(permission);
  }

  hasPermissions(
    access: ProjectAccess,
    permissions: readonly ProjectPermission[],
  ): boolean {
    return permissions.every((permission) =>
      access.permissions.includes(permission),
    );
  }

  requirePermission(
    access: ProjectAccess,
    permission: ProjectPermission,
  ): void {
    if (!this.hasPermission(access, permission)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
  }
}