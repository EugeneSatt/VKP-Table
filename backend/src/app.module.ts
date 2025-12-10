import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "./schedule/schedule.module";
import { PlanSelf } from "./schedule/dto/plan-self.entity";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Подключение MSSQL через TypeORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "mssql",
        host:
          config.get<string>("DB_HOST") ??
          config.get<string>("SQL_SERVER"),
        port: Number(
          config.get<string>("DB_PORT") ?? config.get<string>("SQL_PORT") ?? 1433,
        ),
        username:
          config.get<string>("DB_USER") ??
          config.get<string>("SQL_USER"),
        password:
          config.get<string>("DB_PASS") ??
          config.get<string>("SQL_PASSWORD"),
        database:
          config.get<string>("DB_NAME") ??
          config.get<string>("SQL_DATABASE"),
        entities: [PlanSelf],
        synchronize: false, // схема уже есть
        options: {
          encrypt: false, // если нужно шифрование — поставишь true
        },
      }),
    }),

    ScheduleModule,
  ],
})
export class AppModule {}
