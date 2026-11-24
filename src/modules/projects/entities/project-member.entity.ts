import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
  type Relation,
} from 'typeorm';

import { Project } from './project.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { ProjectRole } from '../enums/project-role.enum.js';

@Entity('project_members')
@Unique('uq_project_member', ['projectId', 'userId'])
@Index(['userId'])
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ProjectRole,
    default: ProjectRole.MEMBER,
  })
  role: ProjectRole;

  @ManyToOne(
    () => Project,
    (project) => project.members,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'project_id' })
project: Relation<Project>;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}