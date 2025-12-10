import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
import { PlanSelf } from "./dto/plan-self.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PlanSelf])],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}