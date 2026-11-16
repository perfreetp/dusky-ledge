import { Body, Controller, Post } from '@nestjs/common';
import type { InspectionResult } from '@pg/shared';
import { runPipeline } from '@pg/geom-kernel';
import { buildEnvelopes, type RobotConfig } from '@pg/robot';
import { InspectDto } from './dto.js';

@Controller('inspection')
export class InspectionController {
  /** 服务端复算几何检查，保证审查数据可信、与客户端版本无关 */
  @Post()
  inspect(@Body() dto: InspectDto): InspectionResult {
    const envelopes = dto.robotConfig
      ? buildEnvelopes(dto.robotConfig, dto.model.jointAngles)
      : undefined;
    const out = runPipeline({
      controlPoints: dto.model.controlPoints,
      interpolation: dto.model.interpolation,
      rules: dto.model.rules,
      projectCode: 'SERVER-CHECK',
      envelopes,
    });
    return out.inspection;
  }
}
