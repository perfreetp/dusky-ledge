import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { IsObject, IsString } from 'class-validator';
import { Roles } from '../auth/auth.decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';

class CreateRobotDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsObject()
  config!: Record<string, unknown>;
}

@Controller('robots')
export class RobotsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const rows = await this.prisma.robotConfig.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      config: JSON.parse(r.configJson) as unknown,
    }));
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const r = await this.prisma.robotConfig.findUniqueOrThrow({ where: { id } });
    return { id: r.id, code: r.code, name: r.name, config: JSON.parse(r.configJson) };
  }

  @Roles('admin')
  @Post()
  async create(@Body() dto: CreateRobotDto) {
    const row = await this.prisma.robotConfig.create({
      data: { code: dto.code, name: dto.name, configJson: JSON.stringify(dto.config) },
    });
    return { id: row.id, code: row.code, name: row.name };
  }
}
