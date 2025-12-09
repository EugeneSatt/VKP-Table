import { Module } from "@nestjs/common";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
// НЕ импортируем TypeOrmModule, НЕ тянем PlanSelf/PlanSelfRepository

@Module({
  imports: [],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}