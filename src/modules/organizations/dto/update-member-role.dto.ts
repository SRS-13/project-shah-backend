import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrganizationRole } from '../entities/organization-member.entity.js';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: [OrganizationRole.ADMIN, OrganizationRole.MEMBER],
  })
  @IsEnum(OrganizationRole)
  role: OrganizationRole.ADMIN | OrganizationRole.MEMBER;
}