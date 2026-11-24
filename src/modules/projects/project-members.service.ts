import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { DataSource, type EntityManager } from 'typeorm';

import { Project } from './entities/project.entity.js';
import { ProjectMember } from './entities/project-member.entity.js';
import { ProjectRole } from './enums/project-role.enum.js';

import { Organization } from '../organizations/entities/organization.entity.js';

import {
  OrganizationMember,
  OrganizationRole,
} from '../organizations/entities/organization-member.entity.js';

import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';
import { ProjectPermission } from './enums/project-permission.enum.js';
import { ProjectAccessService } from './services/project-access.service.js';
import { ProjectAccess } from './interfaces/project-access.interface.js';

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  // Add the following methods here.

  private async getProjectAccess(
    organizationId: string,
    projectId: string,
    currentUserId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<ProjectAccess> {
    return this.projectAccessService.getAccess(organizationId, projectId, currentUserId, manager);
  }

  private async lockOrganization(manager: EntityManager, organizationId: string) {
    const organization = await manager.findOne(Organization, {
      where: { id: organizationId },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
  }

  private async ensureAnotherManagerExists(manager: EntityManager, projectId: string) {
    const count = await manager.count(ProjectMember, {
      where: {
        projectId,
        role: ProjectRole.MANAGER,
      },
    });

    if (count <= 1) {
      throw new BadRequestException('The last project manager cannot be removed or demoted');
    }
  }

  async findAll(organizationId: string, projectId: string, currentUserId: string) {
    await this.getProjectAccess(organizationId, projectId, currentUserId);

    const members = await this.dataSource
      .getRepository(ProjectMember)
      .createQueryBuilder('member')
      .innerJoinAndSelect('member.user', 'user')
      .innerJoin(
        OrganizationMember,
        'orgMember',
        'orgMember.user_id = member.user_id AND orgMember.organization_id = :organizationId',
        { organizationId },
      )
      .where('member.project_id = :projectId', {
        projectId,
      })
      .orderBy('member.created_at', 'ASC')
      .getMany();

    return {
      data: members.map((member) => ({
        id: member.id,
        projectId: member.projectId,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt,
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
        },
      })),
      total: members.length,
    };
  }

  async findEligibleMembers(organizationId: string, projectId: string, currentUserId: string) {
    const access = await this.getProjectAccess(organizationId, projectId, currentUserId);

    this.projectAccessService.requirePermission(access, ProjectPermission.MANAGE_MEMBERS);

    const members = await this.dataSource
      .getRepository(OrganizationMember)
      .createQueryBuilder('member')
      .innerJoinAndSelect('member.user', 'user')
      .leftJoin(
        ProjectMember,
        'projectMember',
        'projectMember.user_id = member.user_id AND projectMember.project_id = :projectId',
        { projectId },
      )
      .where('member.organization_id = :organizationId', {
        organizationId,
      })
      .andWhere('projectMember.id IS NULL')
      .orderBy('user.name', 'ASC')
      .getMany();

    return {
      data: members.map((member) => ({
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        organizationRole: member.role,
      })),
      total: members.length,
    };
  }

  async create(
    organizationId: string,
    projectId: string,
    dto: AddProjectMemberDto,
    currentUserId: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await this.lockOrganization(manager, organizationId);

      const access = await this.getProjectAccess(organizationId, projectId, currentUserId, manager);

      if (!access.canManage) {
        throw new ForbiddenException('You cannot add project members');
      }

      if (!access.isAdmin && dto.role === ProjectRole.MANAGER) {
        throw new ForbiddenException('Only organization owners and admins can assign managers');
      }

      const organizationMember = await manager.findOne(OrganizationMember, {
        where: {
          organizationId,
          userId: dto.userId,
        },
        relations: {
          user: true,
        },
      });

      if (!organizationMember) {
        throw new NotFoundException('User is not an organization member');
      }

      const existingMember = await manager.findOne(ProjectMember, {
        where: {
          projectId,
          userId: dto.userId,
        },
      });

      if (existingMember) {
        throw new ConflictException('User is already a project member');
      }

      const member = manager.create(ProjectMember, {
        projectId,
        userId: dto.userId,
        role: dto.role,
      });

      const saved = await manager.save(ProjectMember, member);

      return {
        id: saved.id,
        projectId: saved.projectId,
        userId: saved.userId,
        role: saved.role,
        createdAt: saved.createdAt,
        user: {
          id: organizationMember.user.id,
          name: organizationMember.user.name,
          email: organizationMember.user.email,
        },
      };
    });
  }

  async updateRole(
    organizationId: string,
    projectId: string,
    memberId: string,
    dto: UpdateProjectMemberDto,
    currentUserId: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await this.lockOrganization(manager, organizationId);

      const access = await this.getProjectAccess(organizationId, projectId, currentUserId, manager);

      if (!access.canManage) {
        throw new ForbiddenException('You cannot update project members');
      }

      const member = await manager.findOne(ProjectMember, {
        where: {
          id: memberId,
          projectId,
        },
      });

      if (!member) {
        throw new NotFoundException('Project member not found');
      }

      const organizationMember = await manager.findOne(OrganizationMember, {
        where: {
          organizationId,
          userId: member.userId,
        },
      });

      if (!organizationMember) {
        throw new NotFoundException('User is no longer an organization member');
      }

      if (!access.isAdmin) {
        if (member.role === ProjectRole.MANAGER || dto.role === ProjectRole.MANAGER) {
          throw new ForbiddenException('Only owners and admins can manage manager roles');
        }
      }

      if (member.role === dto.role) {
        return {
          id: member.id,
          role: member.role,
          message: 'Role is already assigned',
        };
      }

      if (member.role === ProjectRole.MANAGER && dto.role !== ProjectRole.MANAGER) {
        await this.ensureAnotherManagerExists(manager, projectId);
      }

      member.role = dto.role;

      await manager.save(ProjectMember, member);

      return {
        id: member.id,
        userId: member.userId,
        role: member.role,
        message: 'Project member role updated successfully',
      };
    });
  }

  async remove(organizationId: string, projectId: string, memberId: string, currentUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.lockOrganization(manager, organizationId);

      const access = await this.getProjectAccess(organizationId, projectId, currentUserId, manager);

      if (!access.canManage) {
        throw new ForbiddenException('You cannot remove project members');
      }

      const member = await manager.findOne(ProjectMember, {
        where: {
          id: memberId,
          projectId,
        },
      });

      if (!member) {
        throw new NotFoundException('Project member not found');
      }

      if (member.role === ProjectRole.MANAGER) {
        if (!access.isAdmin) {
          throw new ForbiddenException('Only owners and admins can remove managers');
        }

        await this.ensureAnotherManagerExists(manager, projectId);
      }

      await manager.remove(ProjectMember, member);

      return {
        message: 'Project member removed successfully',
        memberId,
      };
    });
  }
}
