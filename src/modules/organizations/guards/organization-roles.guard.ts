import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';

import {
  OrganizationMember,
  OrganizationRole,
} from '../entities/organization-member.entity.js';

import { ORGANIZATION_ROLES_KEY } from '../decorators/organization-roles.decorator.js';

type AuthenticatedRequest = Request & {
  user?: {
    sub: string;
    email: string;
  };
  organizationMember?: OrganizationMember;
};

@Injectable()
export class OrganizationRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,

    @InjectRepository(OrganizationMember)
    private readonly memberRepository: Repository<OrganizationMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<OrganizationRole[]>(
        ORGANIZATION_ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

    // Endpoints without role metadata are not handled by this guard.
    if (requiredRoles === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user?.sub) {
      throw new UnauthorizedException('Authentication required');
    }

    const organizationId = request.params.id;

    if (typeof organizationId !== 'string' || !organizationId) {
      throw new ForbiddenException('Organization ID is required');
    }

    const membership = await this.memberRepository.findOne({
      where: {
        organizationId,
        userId: request.user.sub,
      },
    });

    if (!membership) {
      throw new NotFoundException('Organization not found');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        'Insufficient organization permissions',
      );
    }

    request.organizationMember = membership;

    return true;
  }
}
