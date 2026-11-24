import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { OrganizationRole } from '../entities/organization-member.entity.js';

export class AddMemberDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    enum: [OrganizationRole.ADMIN, OrganizationRole.MEMBER],
    default: OrganizationRole.MEMBER,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrganizationRole)
  role?: OrganizationRole.ADMIN | OrganizationRole.MEMBER;
}