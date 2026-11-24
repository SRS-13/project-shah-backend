import {
  IsUUID,
  IsEnum,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ProjectRole } from '../enums/project-role.enum.js';

export class AddProjectMemberDto {
  @ApiProperty({
    example: 'user-uuid',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    enum: ProjectRole,
    example: ProjectRole.MEMBER,
  })
  @IsEnum(ProjectRole)
  role: ProjectRole;
}