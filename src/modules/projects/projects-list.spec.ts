import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { ProjectsService } from './projects.service.js';
import { Project } from './entities/project.entity.js';
import { ProjectMember } from './entities/project-member.entity.js';
import { OrganizationMember, OrganizationRole } from '../organizations/entities/organization-member.entity.js';
import { ProjectRole } from './enums/project-role.enum.js';
import { ProjectQueryDto } from './dto/project-query.dto.js';

function fixture(role: OrganizationRole) {
  const query = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    withDeleted: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    loadRelationIdAndMap: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn().mockResolvedValue([[
      { id: 'project-a', name: 'Platform', memberIds: ['u1', 'u2'], members: [{ role: ProjectRole.MANAGER }] },
      { id: 'project-b', name: 'Brand', memberIds: [], members: [] },
    ], 12]),
  };
  const memberships = { findOne: vi.fn().mockResolvedValue({ role }) };
  const service = new ProjectsService(
    { createQueryBuilder: () => query } as unknown as Repository<Project>,
    {} as Repository<ProjectMember>,
    memberships as unknown as Repository<OrganizationMember>,
    {} as DataSource,
  );
  return { service, query, memberships };
}

describe('Projects listing for All Projects page', () => {
  it('returns numeric counts, current roles, and server pagination without leaking member IDs', async () => {
    const { service, query, memberships } = fixture(OrganizationRole.ADMIN);
    const result = await service.findAll('org-a', 'user-a', Object.assign(new ProjectQueryDto(), { page: 2, limit: 5 }));
    expect(result.data).toEqual([
      { id: 'project-a', name: 'Platform', memberCount: 2, myRole: 'manager' },
      { id: 'project-b', name: 'Brand', memberCount: 0, myRole: null },
    ]);
    expect(result.meta).toMatchObject({ total: 12, page: 2, limit: 5, totalPages: 3, hasNextPage: true, hasPreviousPage: true });
    expect(memberships.findOne).toHaveBeenCalledWith({ where: { organizationId: 'org-a', userId: 'user-a' } });
    expect(query.where).toHaveBeenCalledWith('project.organizationId = :organizationId', { organizationId: 'org-a' });
    expect(query.leftJoinAndSelect).toHaveBeenCalledWith('project.members', 'currentMembership', 'currentMembership.userId = :currentUserId', { currentUserId: 'user-a' });
    expect(query.skip).toHaveBeenCalledWith(5);
    expect(query.take).toHaveBeenCalledWith(5);
  });

  it('keeps ordinary members restricted to projects they belong to', async () => {
    const { service, query } = fixture(OrganizationRole.MEMBER);
    await service.findAll('org-a', 'user-a', new ProjectQueryDto());
    expect(query.innerJoin).toHaveBeenCalledWith(ProjectMember, 'accessMember', expect.stringContaining('accessMember.userId = :currentUserId'), { currentUserId: 'user-a' });
  });

  it('rejects archived access for ordinary members before querying projects', async () => {
    const { service, query } = fixture(OrganizationRole.MEMBER);
    await expect(service.findAll('org-a', 'user-a', Object.assign(new ProjectQueryDto(), { archiveStatus: 'archived' }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(query.getManyAndCount).not.toHaveBeenCalled();
  });
});
