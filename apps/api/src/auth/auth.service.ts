import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthResponse, UserDto } from '@pg/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { verifyPassword } from './password.util.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const userDto: UserDto = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role as UserDto['role'],
    };
    const token = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return { token, user: userDto };
  }
}
