import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationMember, OrganizationRole } from './entities/organization-member.entity.js';
import { Organization } from './entities/organization.entity.js';
import { DataSource, MoreThan, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { User } from '../users/entities/user.entity.js';
import { AddMemberDto } from './dto/add-member.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import {
  InvitationStatus,
  OrganizationInvitation,
} from './entities/organization-invitation.entity.js';
import { createHash, randomBytes } from 'crypto';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { InvitationTokenDto } from './dto/invitation-token.dto.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,

    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(OrganizationInvitation)
    private readonly invitationRepository: Repository<OrganizationInvitation>,

    private readonly dataSource: DataSource,

    private readonly configService: ConfigService,
  ) {}

  private generateInvitationLink(token: string): string {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    const url = new URL('/invitations/respond', frontendUrl);

    url.searchParams.set('token', token);

    return url.toString();
  }

  private handleDatabaseError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'driverError' in error &&
      (error as { driverError?: { code?: string } }).driverError?.code === '23505'
    ) {
      throw new ConflictException('Organization slug already exists');
    }

    throw error;
  }

  private async getMembership(organizationId: string, userId: string): Promise<OrganizationMember> {
    const membership = await this.organizationMemberRepository.findOne({
      where: { organizationId, userId },
    });

    if (!membership) {
      throw new NotFoundException('Organization not found');
    }

    return membership;
  }

  async create(dto: CreateOrganizationDto, userId: string) {
    const name = dto.name.trim();
    const slug = dto.slug.trim().toLowerCase();

    try {
      return await this.dataSource.transaction(async (manager) => {
        const organization = manager.create(Organization, {
          name,
          slug,
          ownerId: userId,
        });

        const savedOrganization = await manager.save(Organization, organization);

        const membership = manager.create(OrganizationMember, {
          organizationId: savedOrganization.id,
          userId,
          role: OrganizationRole.OWNER,
        });

        await manager.save(OrganizationMember, membership);

        return savedOrganization;
      });
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findAll(userId: string) {
    return this.organizationRepository
      .createQueryBuilder('organization')
      .innerJoin(OrganizationMember, 'member', 'member.organizationId = organization.id')
      .where('member.userId = :userId', { userId })
      .orderBy('organization.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, userId: string) {
    await this.getMembership(id, userId);

    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: string, dto: UpdateOrganizationDto, userId: string) {
    const membership = await this.getMembership(id, userId);

    if (membership.role !== OrganizationRole.OWNER && membership.role !== OrganizationRole.ADMIN) {
      throw new ForbiddenException('Only organization owners and admins can update');
    }

    const organization = await this.findOne(id, userId);

    if (dto.name !== undefined) {
      organization.name = dto.name.trim();
    }

    if (dto.slug !== undefined) {
      organization.slug = dto.slug.trim().toLowerCase();
    }

    try {
      return await this.organizationRepository.save(organization);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async remove(id: string, userId: string) {
    const membership = await this.getMembership(id, userId);

    if (membership.role !== OrganizationRole.OWNER) {
      throw new ForbiddenException('Only the organization owner can delete');
    }

    const result = await this.organizationRepository.delete({
      id,
      ownerId: userId,
    });

    if (!result.affected) {
      throw new NotFoundException('Organization not found');
    }

    return {
      message: 'Organization deleted successfully',
    };
  }

  async findMembers(id: string, userId: string) {
    await this.findOne(id, userId);

    const members = await this.organizationMemberRepository.find({
      where: { organizationId: id },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });

    return members.map((member) => ({
      id: member.id,
      role: member.role,
      joinedAt: member.createdAt,
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
      },
    }));
  }

  async addMember(organizationId: string, dto: AddMemberDto, currentUserId: string) {
    const actor = await this.getMembership(organizationId, currentUserId);

    if (actor.role !== OrganizationRole.OWNER && actor.role !== OrganizationRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can add members');
    }

    const user = await this.userRepository.findOne({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.organizationMemberRepository.findOne({
      where: {
        organizationId,
        userId: user.id,
      },
    });

    if (existing) {
      throw new ConflictException('User is already an organization member');
    }

    const member = this.organizationMemberRepository.create({
      organizationId,
      userId: user.id,
      role: dto.role ?? OrganizationRole.MEMBER,
    });

    try {
      const saved = await this.organizationMemberRepository.save(member);

      return {
        id: saved.id,
        role: saved.role,
        joinedAt: saved.createdAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('User is already a member');
      }
      throw error;
    }
  }

  async updateMemberRole(
    organizationId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    currentUserId: string,
  ) {
    const actor = await this.getMembership(organizationId, currentUserId);

    if (actor.role !== OrganizationRole.OWNER) {
      throw new ForbiddenException('Only the organization owner can change roles');
    }

    const member = await this.organizationMemberRepository.findOne({
      where: {
        id: memberId,
        organizationId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('Cannot change owner role here');
    }

    member.role = dto.role;

    const saved = await this.organizationMemberRepository.save(member);

    return {
      id: saved.id,
      userId: saved.userId,
      role: saved.role,
    };
  }

  async removeMember(organizationId: string, memberId: string, currentUserId: string) {
    const actor = await this.getMembership(organizationId, currentUserId);

    if (actor.role !== OrganizationRole.OWNER && actor.role !== OrganizationRole.ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const member = await this.organizationMemberRepository.findOne({
      where: { id: memberId, organizationId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('Organization owner cannot be removed');
    }

    if (actor.role === OrganizationRole.ADMIN && member.role !== OrganizationRole.MEMBER) {
      throw new ForbiddenException('Admins can only remove regular members');
    }

    await this.organizationMemberRepository.remove(member);

    return {
      message: 'Member removed successfully',
    };
  }
  async leaveOrganization(organizationId: string, currentUserId: string) {
    const membership = await this.getMembership(organizationId, currentUserId);

    if (membership.role === OrganizationRole.OWNER) {
      throw new BadRequestException('Transfer ownership before leaving the organization');
    }

    await this.organizationMemberRepository.remove(membership);

    return {
      message: 'You have left the organization',
    };
  }

  async createInvitation(organizationId: string, dto: CreateInvitationDto, currentUserId: string) {
    const actor = await this.getMembership(organizationId, currentUserId);

    if (actor.role !== OrganizationRole.OWNER && actor.role !== OrganizationRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can invite members');
    }

    const role = dto.role ?? OrganizationRole.MEMBER;

    if (role !== OrganizationRole.ADMIN && role !== OrganizationRole.MEMBER) {
      throw new BadRequestException('Invalid invitation role');
    }

    if (actor.role === OrganizationRole.ADMIN && role === OrganizationRole.ADMIN) {
      throw new ForbiddenException('Only owners can invite admins');
    }

    const email = dto.email.trim().toLowerCase();

    const existingMember = await this.organizationMemberRepository
      .createQueryBuilder('member')
      .innerJoin('member.user', 'user')
      .where('member.organizationId = :organizationId', {
        organizationId,
      })
      .andWhere('LOWER(user.email) = :email', { email })
      .getOne();

    if (existingMember) {
      throw new ConflictException('User is already an organization member');
    }

    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        organizationId,
        email,
        status: InvitationStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (existingInvitation) {
      const token = randomBytes(32).toString('hex');

      const tokenHash = createHash('sha256').update(token).digest('hex');

      const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

      const invitationUrl = new URL('/invitations/respond', frontendUrl);

      invitationUrl.searchParams.set('token', token);
      // throw new ConflictException('An active invitation already exists');
      return {
        id: existingInvitation.id,
        organizationId: existingInvitation.organizationId,
        email: existingInvitation.email,
        role: existingInvitation.role,
        status: existingInvitation.status,
        expiresAt: existingInvitation.expiresAt,
        invitationLink: invitationUrl.toString(),
      };
    }

    const token = randomBytes(32).toString('hex');

    const tokenHash = createHash('sha256').update(token).digest('hex');

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    const invitationUrl = new URL('/invitations/respond', frontendUrl);

    invitationUrl.searchParams.set('token', token);

    const invitation = this.invitationRepository.create({
      organizationId,
      email,
      role,
      tokenHash,
      status: InvitationStatus.PENDING,
      invitedBy: currentUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const saved = await this.invitationRepository.save(invitation);

    return {
      id: saved.id,
      organizationId: saved.organizationId,
      email: saved.email,
      role: saved.role,
      status: saved.status,
      expiresAt: saved.expiresAt,
      invitationLink: invitationUrl.toString(),
    };
  }

  async findInvitations(organizationId: string, currentUserId: string) {
    const actor = await this.getMembership(organizationId, currentUserId);

    if (actor.role !== OrganizationRole.OWNER && actor.role !== OrganizationRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can view invitations');
    }

    const invitations = await this.invitationRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });

    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    }));
  }

  async acceptInvitation(dto: InvitationTokenDto, currentUserId: string) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    return this.dataSource.transaction(async (manager) => {
      const invitation = await manager
        .getRepository(OrganizationInvitation)
        .createQueryBuilder('invitation')
        .setLock('pessimistic_write')
        .where('invitation.tokenHash = :tokenHash', { tokenHash })
        .getOne();

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException('Invitation is no longer active');
      }

      if (invitation.expiresAt <= new Date()) {
        throw new BadRequestException('Invitation has expired');
      }

      const user = await manager.getRepository(User).findOne({
        where: { id: currentUserId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.email.trim().toLowerCase() !== invitation.email.trim().toLowerCase()) {
        throw new ForbiddenException('Invitation belongs to another email address');
      }

      const existingMember = await manager.getRepository(OrganizationMember).findOne({
        where: {
          organizationId: invitation.organizationId,
          userId: currentUserId,
        },
      });

      if (existingMember) {
        throw new ConflictException('You are already an organization member');
      }

      const member = manager.create(OrganizationMember, {
        organizationId: invitation.organizationId,
        userId: currentUserId,
        role: invitation.role,
      });

      await manager.save(OrganizationMember, member);

      invitation.status = InvitationStatus.ACCEPTED;
      await manager.save(OrganizationInvitation, invitation);

      return {
        message: 'Invitation accepted successfully',
        organizationId: invitation.organizationId,
        role: member.role,
      };
    });
  }
  async declineInvitation(dto: InvitationTokenDto, currentUserId: string) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    return this.dataSource.transaction(async (manager) => {
      const invitation = await manager
        .getRepository(OrganizationInvitation)
        .createQueryBuilder('invitation')
        .setLock('pessimistic_write')
        .where('invitation.tokenHash = :tokenHash', { tokenHash })
        .getOne();

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException('Invitation is no longer active');
      }

      if (invitation.expiresAt <= new Date()) {
        throw new BadRequestException('Invitation has expired');
      }

      const user = await manager.getRepository(User).findOne({
        where: { id: currentUserId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.email.trim().toLowerCase() !== invitation.email.trim().toLowerCase()) {
        throw new ForbiddenException('Invitation belongs to another email address');
      }

      invitation.status = InvitationStatus.DECLINED;

      await manager.save(OrganizationInvitation, invitation);

      return {
        message: 'Invitation declined successfully',
      };
    });
  }

  async revokeInvitation(organizationId: string, invitationId: string, currentUserId: string) {
    const actor = await this.getMembership(organizationId, currentUserId);

    if (actor.role !== OrganizationRole.OWNER && actor.role !== OrganizationRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can revoke invitations');
    }

    const result = await this.invitationRepository.update(
      {
        id: invitationId,
        organizationId,
        status: InvitationStatus.PENDING,
      },
      {
        status: InvitationStatus.REVOKED,
      },
    );

    if (!result.affected) {
      throw new NotFoundException('Active invitation not found');
    }

    return {
      message: 'Invitation revoked successfully',
    };
  }

  async transferOwnership(organizationId: string, newOwnerId: string, currentUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const organization = await manager
        .getRepository(Organization)
        .createQueryBuilder('organization')
        .setLock('pessimistic_write')
        .where('organization.id = :organizationId', {
          organizationId,
        })
        .getOne();

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      if (organization.ownerId !== currentUserId) {
        throw new ForbiddenException('Only the current owner can transfer ownership');
      }

      if (currentUserId === newOwnerId) {
        throw new BadRequestException('You already own this organization');
      }

      const members = await manager
        .getRepository(OrganizationMember)
        .createQueryBuilder('member')
        .where('member.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('member.userId IN (:...userIds)', {
          userIds: [currentUserId, newOwnerId],
        })
        .getMany();

      const currentOwnerMember = members.find((member) => member.userId === currentUserId);

      const newOwnerMember = members.find((member) => member.userId === newOwnerId);

      if (!currentOwnerMember) {
        throw new ConflictException('Current owner membership is missing');
      }

      if (currentOwnerMember.role !== OrganizationRole.OWNER) {
        throw new ConflictException('Current owner role is inconsistent');
      }

      if (!newOwnerMember) {
        throw new BadRequestException('New owner must already be an organization member');
      }

      // Demote previous owner to admin.
      currentOwnerMember.role = OrganizationRole.ADMIN;

      // Promote selected member to owner.
      newOwnerMember.role = OrganizationRole.OWNER;

      await manager.save(OrganizationMember, [currentOwnerMember, newOwnerMember]);

      organization.ownerId = newOwnerId;

      await manager.save(Organization, organization);

      return {
        message: 'Organization ownership transferred successfully',
        organizationId: organization.id,
        previousOwnerId: currentUserId,
        newOwnerId,
      };
    });
  }
  async previewInvitation(dto: InvitationTokenDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    const invitation = await this.invitationRepository.findOne({
      where: { tokenHash },
      relations: {
        organization: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is no longer active');
    }

    if (invitation.expiresAt <= new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    return {
      id: invitation.id,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
      },
    };
  }

  async regenerateInvitation(organizationId: string, invitationId: string, currentUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const actor = await manager.findOne(OrganizationMember, {
        where: {
          organizationId,
          userId: currentUserId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!actor) {
        throw new NotFoundException('Organization not found');
      }

      if (actor.role !== OrganizationRole.OWNER && actor.role !== OrganizationRole.ADMIN) {
        throw new ForbiddenException('Only owners and admins can regenerate invitations');
      }

      const invitation = await manager.findOne(OrganizationInvitation, {
        where: {
          id: invitationId,
          organizationId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException('Only pending invitations can be regenerated');
      }

      if (
        invitation.role !== OrganizationRole.ADMIN &&
        invitation.role !== OrganizationRole.MEMBER
      ) {
        throw new BadRequestException('Invalid invitation role');
      }

      if (actor.role === OrganizationRole.ADMIN && invitation.role === OrganizationRole.ADMIN) {
        throw new ForbiddenException('Only owners can regenerate admin invitations');
      }

      const existingMember = await manager
        .getRepository(OrganizationMember)
        .createQueryBuilder('member')
        .innerJoin('member.user', 'user')
        .where('member.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('LOWER(user.email) = :email', {
          email: invitation.email.trim().toLowerCase(),
        })
        .getOne();

      if (existingMember) {
        throw new ConflictException('User is already an organization member');
      }

      const existingInvitation = await manager.findOne(OrganizationInvitation, {
        where: {
          organizationId,
          email: invitation.email,
          id: Not(invitationId),
          status: InvitationStatus.PENDING,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (existingInvitation) {
        throw new ConflictException('Another active invitation already exists');
      }

      const token = randomBytes(32).toString('hex');

      invitation.tokenHash = createHash('sha256').update(token).digest('hex');

      invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitationLink = this.generateInvitationLink(token);

      const saved = await manager.save(OrganizationInvitation, invitation);

      return {
        message: 'Invitation link regenerated successfully',
        id: saved.id,
        organizationId: saved.organizationId,
        email: saved.email,
        role: saved.role,
        status: saved.status,
        expiresAt: saved.expiresAt,
        invitationLink,
      };
    });
  }
}
