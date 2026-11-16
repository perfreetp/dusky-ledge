import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { ProjectRules, ReviewStatus, SplineModel } from '@pg/shared';

export class CreateProjectDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsString()
  robotConfigId!: string;

  @IsObject()
  rules!: ProjectRules;
}

export class SaveVersionDto {
  @IsObject()
  model!: SplineModel;

  @IsString()
  @IsOptional()
  changeNote?: string;
}

export class UpdateStatusDto {
  @IsString()
  status!: ReviewStatus;
}

export class ReviewActionDto {
  @IsString()
  comment!: string;
}

export class DiffQueryDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Object)
  placeholder?: unknown[];
}
