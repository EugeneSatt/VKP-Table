import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ScheduleService } from "./schedule.service";
import { ScheduleController } from "./schedule.controller";
import { PlanSelf } from "./dto/plan-self.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PlanSelf])],
  providers: [ScheduleService],
  controllers: [ScheduleController],
})
export class ScheduleModule {}

