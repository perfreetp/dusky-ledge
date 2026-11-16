import { IsObject, IsOptional } from 'class-validator';
import type { SplineModel } from '@pg/shared';
import type { RobotConfig } from '@pg/robot';

export class InspectDto {
  @IsObject()
  model!: SplineModel;

  @IsOptional()
  @IsObject()
  robotConfig!: RobotConfig | null;
}
