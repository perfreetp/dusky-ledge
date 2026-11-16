import { Module } from '@nestjs/common';
import { InspectionController } from './inspection.controller.js';

@Module({ controllers: [InspectionController] })
export class InspectionModule {}
