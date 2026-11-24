import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { ProjectStatus } from '../enums/project-status.enum.js';
import { ProjectPriority } from '../enums/project-priority.enum.js';

export class ProjectQueryDto {
  @ApiPropertyOptional({ example: 'website' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: ProjectPriority })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt', 'name', 'dueDate'],
    default: 'createdAt',
  })
  @IsIn(['createdAt', 'updatedAt', 'name', 'dueDate'])
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    enum: ['active', 'archived'],
    default: 'active',
  })
  @IsIn(['active', 'archived'])
  archiveStatus: 'active' | 'archived' = 'active';
}