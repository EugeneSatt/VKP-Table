// src/schedule/schedule.controller.ts

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ScheduleService } from "./schedule.service";
import { BulkUpsertDto } from "./dto/bulk-upsert.dto";
import { RenameArticleDto } from "./dto/rename-article.dto";

@Controller("schedule")
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // Матрица для фронта (артикул × даты)
  @Get()
  async getMatrix(
    @Query("startDate") startDate?: string,
    @Query("days") days?: string,
  ) {
    const baseStart = startDate ?? new Date().toISOString().slice(0, 10);
    const baseDays = days ? parseInt(days, 10) : 30;

    return this.scheduleService.getMatrix(baseStart, baseDays);
  }

  // RAW-данные из таблицы (можно теми же параметрами управлять)
  @Get("raw")
  async getAllRaw(
    @Query("startDate") startDate?: string,
    @Query("days") days?: string,
  ) {
    const baseStart = startDate ?? new Date().toISOString().slice(0, 10);
    const baseDays = days ? parseInt(days, 10) : 30;

    return this.scheduleService.getRaw(baseStart, baseDays);
  }

  // Bulk upsert из матрицы фронта
  @Post("bulk")
  async bulkUpsert(@Body() dto: BulkUpsertDto) {
    await this.scheduleService.bulkUpsert(dto);
    return { status: "ok" };
  }

  // Массовое переименование артикула
  @Post("rename-article")
  async renameArticle(@Body() dto: RenameArticleDto) {
    await this.scheduleService.renameArticle(dto);
    return { status: "renamed" };
  }

  // Загрузка Excel (как твой Python-скрипт, только через Nest)
  @Post("upload-excel")
  @UseInterceptors(FileInterceptor("file"))
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Файл не передан");
    }

    const result = await this.scheduleService.importFromExcel(file);

    return {
      status: "ok",
      imported: result.inserted,
    };
  }
}
