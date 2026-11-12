import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = :email', {
        email: email.toLowerCase(),
      })
      .getOne();
  }

  async create(name: string, email: string, passwordHash: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = this.userRepository.create({
      name,
      email: normalizedEmail,
      passwordHash,
    });

    try {
      return await this.userRepository.save(user);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }
}
