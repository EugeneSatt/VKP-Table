import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import * as XLSX from "xlsx";
import { BulkUpsertDto } from "./dto/bulk-upsert.dto";
import { RenameArticleDto } from "./dto/rename-article.dto";
import { PlanSelf } from "./dto/plan-self.entity";

const UPSERT_BATCH_SIZE = 600;

// ---- Типы для матрицы, которую ест фронт ----

export interface MatrixRow {
  article: string;
  originalArticle: string | null;
  values: (number | null)[];
}

export interface ScheduleMatrix {
  startDate: string;
  days: number;
  dates: string[];
  rows: MatrixRow[];
}

type PlanRecord = { date: Date; article: string; qty: number };

// ================== ХЕЛПЕРЫ ==================

function excelValueToDate(v: any): Date | null {
  if (v instanceof Date) return v;

  if (typeof v === "number") {
    const parsed = (XLSX.SSF as any).parse_date_code(v);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  if (typeof v === "string") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateKey(d: Date | string | unknown): string {
  if (d instanceof Date) {
    return d.toISOString().slice(0, 10);
  }
  const parsed = new Date(d as any);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value in toDateKey: ${String(d)}`);
  }
  return parsed.toISOString().slice(0, 10);
}

function deduplicateRecords(records: PlanRecord[]): PlanRecord[] {
  const map = new Map<string, PlanRecord>();

  for (const r of records) {
    const key = `${r.article}__${toDateKey(r.date)}`;
    map.set(key, r);
  }

  return Array.from(map.values());
}

// ================== СЕРВИС ==================

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(PlanSelf)
    private readonly repo: Repository<PlanSelf>,
  ) {}

  // RAW данные из БД
  async getRaw(startDate: string, days: number): Promise<PlanSelf[]> {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw new BadRequestException("Неверная стартовая дата");
    }
    const end = addDays(start, days);

    return this.repo.find({
      where: {
        date: Between(start, end),
      },
      order: {
        article: "ASC",
        date: "ASC",
      },
    });
  }

  // Матрица для фронта
  async getMatrix(startDate: string, days: number): Promise<ScheduleMatrix> {
    const rows = await this.getRaw(startDate, days);

    const start = new Date(startDate);
    const dateKeys: string[] = [];
    for (let i = 0; i < days; i++) {
      dateKeys.push(toDateKey(addDays(start, i)));
    }

    const byArticle = new Map<string, Map<string, number>>();

    for (const row of rows) {
      const article = row.article.toUpperCase().trim();
      const dateKey = toDateKey(row.date);

      if (!byArticle.has(article)) {
        byArticle.set(article, new Map());
      }
      byArticle.get(article)!.set(dateKey, row.qty);
    }

    const matrixRows: MatrixRow[] = Array.from(byArticle.entries()).map(
      ([article, dateMap]) => {
        const values = dateKeys.map((dk) =>
          dateMap.has(dk) ? dateMap.get(dk)! : null,
        );

        return {
          article,
          originalArticle: article,
          values,
        };
      },
    );

    return {
      startDate: toDateKey(start),
      days,
      dates: dateKeys,
      rows: matrixRows,
    };
  }

  // Bulk upsert
  async bulkUpsert(dto: BulkUpsertDto): Promise<void> {
    const rawRecords: PlanRecord[] = dto.entries.map((e) => ({
      date: new Date(e.date),
      article: e.article.toUpperCase().trim(),
      qty: e.qty,
    }));

    const records = deduplicateRecords(rawRecords);
    if (!records.length) return;

    for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
      const chunk = records.slice(i, i + UPSERT_BATCH_SIZE);
      await this.repo.upsert(chunk, ["date", "article"]);
    }
  }

  // Переименование артикула
  async renameArticle(dto: RenameArticleDto): Promise<{ updated: number }> {
    const oldArticle = dto.oldArticle.toUpperCase().trim();
    const newArticle = dto.newArticle.toUpperCase().trim();

    if (!oldArticle || !newArticle) {
      throw new BadRequestException("Оба артикула обязательны");
    }

    if (oldArticle === newArticle) {
      return { updated: 0 };
    }

    const result = await this.repo
      .createQueryBuilder()
      .update(PlanSelf)
      .set({ article: newArticle })
      .where("article = :oldArticle", { oldArticle })
      .execute();

    return { updated: result.affected ?? 0 };
  }

  // Импорт Excel в БД
  async importFromExcel(
    file: Express.Multer.File,
  ): Promise<{ inserted: number }> {
    if (!file?.buffer) {
      throw new BadRequestException("Файл не найден");
    }

    const workbook = XLSX.read(file.buffer, {
      type: "buffer",
      cellDates: true,
    });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException("В Excel нет листов");
    }
    const sheet = workbook.Sheets[sheetName];

    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
    });

    if (rawRows.length <= 4) {
      throw new BadRequestException(
        "Слишком мало строк в Excel (нужно хотя бы 4 строки заголовков + данные)",
      );
    }

    const headerRowIndex = 3;
    const headerRow = rawRows[headerRowIndex];
    if (!headerRow) {
      throw new BadRequestException(
        "Не удалось прочитать строку заголовков (row 4)",
      );
    }

    const articleColIndex = 5;

    const dateColIndexes: number[] = [];
    for (let colIdx = 15; colIdx < headerRow.length; colIdx++) {
      const cellVal = headerRow[colIdx];
      const d = excelValueToDate(cellVal);
      if (d) {
        dateColIndexes.push(colIdx);
      }
    }

    if (!dateColIndexes.length) {
      throw new BadRequestException(
        "Не нашёл ни одной колонки с датой, начиная с столбца P в строке 4",
      );
    }

    const tempRecords: PlanRecord[] = [];

    for (let rowIdx = headerRowIndex + 1; rowIdx < rawRows.length; rowIdx++) {
      const row = rawRows[rowIdx];
      if (!row) continue;

      let article = row[articleColIndex];
      if (!article) continue;

      article = String(article).trim().toUpperCase();
      if (!article) continue;

      for (const colIdx of dateColIndexes) {
        const qtyRaw = row[colIdx];
        if (qtyRaw === null || qtyRaw === undefined || qtyRaw === "") continue;

        const qtyNum = Number(qtyRaw);
        if (!Number.isFinite(qtyNum)) continue;
        if (qtyNum === 0) continue;

        const headerVal = headerRow[colIdx];
        const date = excelValueToDate(headerVal);
        if (!date) continue;

        tempRecords.push({
          date,
          article,
          qty: Math.trunc(qtyNum),
        });
      }
    }

    if (!tempRecords.length) {
      return { inserted: 0 };
    }

    const records = deduplicateRecords(tempRecords);

    let total = 0;
    for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
      const chunk = records.slice(i, i + UPSERT_BATCH_SIZE);
      await this.repo.upsert(chunk, ["date", "article"]);
      total += chunk.length;
    }

    return { inserted: total };
  }
}
