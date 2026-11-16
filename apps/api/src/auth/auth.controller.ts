import { Body, Controller, Get, Inject, Post, Req } from '@nestjs/common';
import type { AuthResponse } from '@pg/shared';
import { AuthService } from './auth.service.js';
import { Public } from './auth.decorators.js';
import { LoginDto } from './dto.js';

interface AuthedReq {
  user: { sub: string; username: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto.username, dto.password);
  }

  @Get('me')
  me(@Req() req: AuthedReq) {
    return req.user;
  }
}
