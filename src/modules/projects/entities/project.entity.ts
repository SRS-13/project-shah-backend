import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Unique,
  Index,
} from 'typeorm';

import { Organization } from '../../organizations/entities/organization.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { ProjectMember } from './project-member.entity.js';
import { ProjectStatus } from '../enums/project-status.enum.js';
import { ProjectPriority } from '../enums/project-priority.enum.js';

@Entity('projects')
@Unique('uq_project_organization_key', [
  'organizationId',
  'key',
])
@Index(['organizationId', 'status'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 10 })
  key: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: ProjectPriority,
    default: ProjectPriority.MEDIUM,
  })
  priority: ProjectPriority;

  @Column({
    name: 'start_date',
    type: 'date',
    nullable: true,
  })
  startDate: string | null;

  @Column({
    name: 'due_date',
    type: 'date',
    nullable: true,
  })
  dueDate: string | null;

  @Column({
    name: 'color',
    length: 7,
    default: '#6366F1',
  })
  color: string;

  @Column({
    name: 'created_by',
    type: 'uuid',
    nullable: true,
  })
  createdBy: string | null;

  @ManyToOne(() => Organization, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @OneToMany(
    () => ProjectMember,
    (member) => member.project,
  )
  members: ProjectMember[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}