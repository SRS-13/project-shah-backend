import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository, QueryFailedError, Brackets, type EntityManager } from 'typeorm';

import { Project } from './entities/project.entity.js';
import { ProjectMember } from './entities/project-member.entity.js';

import {
  OrganizationMember,
  OrganizationRole,
} from '../organizations/entities/organization-member.entity.js';

import { Organization } from '../organizations/entities/organization.entity.js';

import { ProjectRole } from './enums/project-role.enum.js';
import { ProjectStatus } from './enums/project-status.enum.js';
import { ProjectPriority } from './enums/project-priority.enum.js';

import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectQueryDto } from './dto/project-query.dto.js';
import { ProjectAccessService } from './services/project-access.service.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,

    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,

    private readonly dataSource: DataSource,

    private readonly projectAccessService: ProjectAccessService,
  ) {}
  private async getOrganizationMembership(
    organizationId: string,
    userId: string,
    manager?: EntityManager,
  ) {
    const repository = manager
      ? manager.getRepository(OrganizationMember)
      : this.organizationMemberRepository;

    const membership = await repository.findOne({
      where: {
        organizationId,
        userId,
      },
    });

    if (!membership) {
      throw new NotFoundException('Organization not found');
    }

    return membership;
  }

  private isOrganizationAdmin(role: OrganizationRole): boolean {
    return role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN;
  }

  private async getProjectAccess(
    organizationId: string,
    projectId: string,
    currentUserId: string,
    manager: EntityManager = this.dataSource.manager,
  ) {
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

    return organization;
  }

  private validateProjectDates(startDate?: string | null, dueDate?: string | null) {
    if (startDate && dueDate && dueDate < startDate) {
      throw new BadRequestException('Due date cannot be earlier than start date');
    }
  }

  async create(organizationId: string, dto: CreateProjectDto, currentUserId: string) {
    this.validateProjectDates(dto.startDate, dto.dueDate);

    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.lockOrganization(manager, organizationId);

        const actor = await this.getOrganizationMembership(organizationId, currentUserId, manager);

        if (!this.isOrganizationAdmin(actor.role)) {
          throw new ForbiddenException('Only owners and admins can create projects');
        }

        const project = manager.create(Project, {
          organizationId,
          name: dto.name.trim(),
          key: dto.key.trim().toUpperCase(),
          description: dto.description ?? null,
          status: dto.status ?? ProjectStatus.PLANNING,
          priority: dto.priority ?? ProjectPriority.MEDIUM,
          startDate: dto.startDate ?? null,
          dueDate: dto.dueDate ?? null,
          color: dto.color ?? '#6366F1',
          createdBy: currentUserId,
        });

        const savedProject = await manager.save(Project, project);

        const member = manager.create(ProjectMember, {
          projectId: savedProject.id,
          userId: currentUserId,
          role: ProjectRole.MANAGER,
        });

        await manager.save(ProjectMember, member);

        return {
          ...savedProject,
          myRole: ProjectRole.MANAGER,
          memberCount: 1,
        };
      });
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as {
          code?: string;
          constraint?: string;
        };

        if (
          driverError.code === '23505' &&
          driverError.constraint === 'uq_project_organization_key'
        ) {
          throw new ConflictException('Project key already exists in this organization');
        }
      }

      throw error;
    }
  }

  async findAll(organizationId: string, currentUserId: string, query: ProjectQueryDto) {
    const actor = await this.getOrganizationMembership(organizationId, currentUserId);

    const isAdmin = this.isOrganizationAdmin(actor.role);

    const {
      page = 1,
      limit = 10,
      search,
      status,
      priority,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      archiveStatus = 'active',
    } = query;

    if (archiveStatus === 'archived' && !isAdmin) {
      throw new ForbiddenException('Only owners and admins can view archived projects');
    }

    const qb = this.projectRepository
      .createQueryBuilder('project')
      .where('project.organizationId = :organizationId', {
        organizationId,
      });

    if (archiveStatus === 'archived') {
      qb.withDeleted();
      qb.andWhere('project.deletedAt IS NOT NULL');
    }

    if (!isAdmin) {
      qb.innerJoin(
        ProjectMember,
        'accessMember',
        `
        accessMember.projectId = project.id
        AND accessMember.userId = :currentUserId
      `,
        { currentUserId },
      );
    }

    if (search?.trim()) {
      qb.andWhere(
        new Brackets((subQuery) => {
          subQuery
            .where('project.name ILIKE :search')
            .orWhere('project.key ILIKE :search')
            .orWhere('project.description ILIKE :search');
        }),
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    if (status) {
      qb.andWhere('project.status = :status', { status });
    }

    if (priority) {
      qb.andWhere('project.priority = :priority', { priority });
    }

    const allowedSortFields: Record<string, string> = {
      createdAt: 'project.createdAt',
      updatedAt: 'project.updatedAt',
      name: 'project.name',
      dueDate: 'project.dueDate',
    };

    qb.loadRelationIdAndMap('project.memberIds', 'project.members');
    qb.leftJoinAndSelect(
      'project.members',
      'currentMembership',
      'currentMembership.userId = :currentUserId',
      { currentUserId },
    );

    qb.orderBy(
      allowedSortFields[sortBy] ?? 'project.createdAt',
      sortOrder === 'ASC' ? 'ASC' : 'DESC',
      'NULLS LAST',
    );

    qb.addOrderBy('project.id', 'ASC');

    qb.skip((page - 1) * limit).take(limit);

    const [projects, total] = await qb.getManyAndCount();

    return {
      data: projects.map((project) => {
        const { memberIds, members, ...details } = project as Project & {
          memberIds: string[];
        };
        return {
          ...details,
          memberCount: memberIds?.length ?? 0,
          myRole: members?.[0]?.role ?? null,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(organizationId: string, projectId: string, currentUserId: string) {
    const access = await this.getProjectAccess(organizationId, projectId, currentUserId);

    const memberCount = await this.projectMemberRepository.count({
      where: { projectId },
    });

    return {
      ...access.project,
      memberCount,
      myRole: access.projectMember?.role ?? null,
      organizationRole: access.organizationMember.role,
      permissions: {
        canUpdate: access.isAdmin || access.projectMember?.role === ProjectRole.MANAGER,

        canDelete: access.isAdmin,

        canManageMembers: access.isAdmin || access.projectMember?.role === ProjectRole.MANAGER,
      },
    };
  }

  async update(
    organizationId: string,
    projectId: string,
    dto: UpdateProjectDto,
    currentUserId: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await this.lockOrganization(manager, organizationId);

      const access = await this.getProjectAccess(organizationId, projectId, currentUserId, manager);

      if (!access.isAdmin && access.projectMember?.role !== ProjectRole.MANAGER) {
        throw new ForbiddenException('You do not have permission to update this project');
      }

      const project = access.project;

      const startDate = dto.startDate !== undefined ? dto.startDate : project.startDate;

      const dueDate = dto.dueDate !== undefined ? dto.dueDate : project.dueDate;

      this.validateProjectDates(startDate, dueDate);

      if (dto.name !== undefined) {
        if (!dto.name?.trim()) {
          throw new BadRequestException('Project name is required');
        }

        project.name = dto.name.trim();
      }

      if (dto.description !== undefined) {
        project.description = dto.description;
      }

      if (dto.status !== undefined) {
        if (!dto.status) {
          throw new BadRequestException('Invalid project status');
        }

        project.status = dto.status;
      }

      if (dto.priority !== undefined) {
        if (!dto.priority) {
          throw new BadRequestException('Invalid project priority');
        }

        project.priority = dto.priority;
      }

      if (dto.color !== undefined) {
        if (!dto.color) {
          throw new BadRequestException('Invalid project color');
        }

        project.color = dto.color;
      }

      project.startDate = startDate;
      project.dueDate = dueDate;

      return manager.save(Project, project);
    });
  }

  async remove(organizationId: string, projectId: string, currentUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.lockOrganization(manager, organizationId);

      const actor = await this.getOrganizationMembership(organizationId, currentUserId, manager);

      if (!this.isOrganizationAdmin(actor.role)) {
        throw new ForbiddenException('Only owners and admins can archive projects');
      }

      const project = await manager.findOne(Project, {
        where: {
          id: projectId,
          organizationId,
        },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      await manager.softDelete(Project, {
        id: projectId,
        organizationId,
      });

      return {
        message: 'Project archived successfully',
        projectId,
      };
    });
  }

  async restore(organizationId: string, projectId: string, currentUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.lockOrganization(manager, organizationId);

      const actor = await this.getOrganizationMembership(organizationId, currentUserId, manager);

      if (!this.isOrganizationAdmin(actor.role)) {
        throw new ForbiddenException('Only owners and admins can restore projects');
      }

      const project = await manager.findOne(Project, {
        where: {
          id: projectId,
          organizationId,
        },
        withDeleted: true,
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      if (!project.deletedAt) {
        throw new BadRequestException('Project is not archived');
      }

      await manager.restore(Project, {
        id: projectId,
        organizationId,
      });

      return {
        message: 'Project restored successfully',
        projectId,
      };
    });
  }
  // Add the following methods here.
}
