import { Controller, Get, Inject } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserDto } from '@pg/shared';

@Controller('users')
export class UsersController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Roles('admin')
  @Get()
  async list(): Promise<Omit<UserDto, 'id'>[]> {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return users.map((u) => ({
      username: u.username,
      displayName: u.displayName,
      role: u.role as UserDto['role'],
    }));
  }
}
