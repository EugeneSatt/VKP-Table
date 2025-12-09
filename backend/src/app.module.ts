import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "./schedule/schedule.module";
import { PlanSelf } from "./schedule/dto/plan-self.entity";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: "mssql",
      host: process.env.DB_HOST || process.env.SQL_SERVER,
      port: Number(process.env.DB_PORT) || 1433,
      username: process.env.DB_USERNAME || process.env.SQL_USER,
      password: process.env.DB_PASSWORD || process.env.SQL_PASSWORD,
      database: process.env.DB_NAME || process.env.SQL_DATABASE,
      entities: [PlanSelf],
      synchronize: false, // ТАБЛИЦА уже существует – схему не трогаем
      options: {
        encrypt: false,
      },
    }),

    ScheduleModule,
  ],
})
export class AppModule {}
