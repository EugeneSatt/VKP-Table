import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "./schedule/schedule.module";
import { PlanSelf } from "./schedule/dto/plan-self.entity";

// БАЗОВЫЕ ИМПОРТЫ – ВСЕГДА
const importsArray: any[] = [
  ConfigModule.forRoot({ isGlobal: true }),
  ScheduleModule,
];

// ПОДКЛЮЧЕНИЕ К MSSQL – ТОЛЬКО ЕСЛИ БД ВКЛЮЧЕНА
if (process.env.DISABLE_DB !== "1") {
  importsArray.push(
    TypeOrmModule.forRoot({
      type: "mssql",
      host: process.env.DB_HOST || process.env.SQL_SERVER,
      port: Number(process.env.DB_PORT) || 1433,
      username: process.env.DB_USERNAME || process.env.SQL_USER,
      password: process.env.DB_PASSWORD || process.env.SQL_PASSWORD,
      database: process.env.DB_NAME || process.env.SQL_DATABASE,
      entities: [PlanSelf],
      synchronize: false,
      options: { encrypt: false },
    }),
  );
}

@Module({
  imports: importsArray,
})
export class AppModule {}
