import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators.js';
import type { UserRole } from '@pg/shared';

interface AuthedRequest {
  headers: { authorization?: string };
  user?: { sub: string; username: string; role: UserRole };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const cls = context.getClass();
    const isPublic =
      Reflect.getMetadata(IS_PUBLIC_KEY, handler) ?? Reflect.getMetadata(IS_PUBLIC_KEY, cls);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('缺少访问令牌');
    try {
      req.user = this.jwt.verify(token) as AuthedRequest['user'];
    } catch {
      throw new UnauthorizedException('令牌无效或已过期');
    }

    const requiredRoles: UserRole[] | undefined =
      Reflect.getMetadata(ROLES_KEY, handler) ?? Reflect.getMetadata(ROLES_KEY, cls);
    if (requiredRoles && !requiredRoles.includes(req.user!.role)) {
      throw new UnauthorizedException('当前角色无权执行该操作');
    }
    return true;
  }
}
