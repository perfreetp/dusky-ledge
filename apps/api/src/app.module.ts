import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { RobotsModule } from './robots/robots.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { StatsModule } from './stats/stats.module.js';
import { InspectionModule } from './inspection/inspection.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    RobotsModule,
    ProjectsModule,
    ReviewsModule,
    StatsModule,
    InspectionModule,
  ],
})
export class AppModule {}
