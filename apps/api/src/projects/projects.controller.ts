import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/auth.decorators.js';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto, SaveVersionDto } from './dto.js';

interface AuthedReq {
  user: { sub: string; username: string; role: string };
}

@Controller('projects')
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly service: ProjectsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @Roles('engineer', 'admin')
  create(@Body() dto: CreateProjectDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Get(':id/versions')
  listVersions(@Param('id') id: string) {
    return this.service.listVersions(id);
  }

  @Get(':id/versions/:version')
  getVersion(@Param('id') id: string, @Param('version', ParseIntPipe) version: number) {
    return this.service.getVersion(id, version);
  }

  @Post(':id/versions')
  @Roles('engineer', 'admin')
  saveVersion(
    @Param('id') id: string,
    @Body() dto: SaveVersionDto,
    @Req() req: AuthedReq,
  ) {
    return this.service.saveVersion(id, dto, req.user.sub);
  }

  @Get(':id/diff')
  diff(
    @Param('id') id: string,
    @Query('from', ParseIntPipe) from: number,
    @Query('to', ParseIntPipe) to: number,
  ) {
    return this.service.diff(id, from, to);
  }
}
