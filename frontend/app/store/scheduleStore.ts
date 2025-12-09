"use client";

import { create } from "zustand";

export type MatrixRow = {
  originalArticle: string; // что пришло из БД ("" для новых)
  article: string;         // текущее значение в инпуте
  values: (number | null)[];
};

export type ScheduleMatrixFromBackend = {
  dates: string[];
  rows: {
    article: string;
    values: (number | null)[];
  }[];
};

type RenamePayload = {
  oldArticle: string;
  newArticle: string;
};

type ScheduleState = {
  dates: string[];
  rows: MatrixRow[];

  setFromServer: (matrix: ScheduleMatrixFromBackend) => void;

  updateCell: (rowIndex: number, colIndex: number, value: number | null) => void;
  updateArticle: (rowIndex: number, newArticle: string) => void;

  addRow: () => void;

  toPayload: () => { entries: { date: string; article: string; qty: number }[] };
  getRenames: () => RenamePayload[];
};

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  dates: [],
  rows: [],

  setFromServer: (matrix) =>
    set({
      dates: matrix.dates,
      rows: matrix.rows.map((r) => ({
        originalArticle: r.article,
        article: r.article,
        values: [...r.values],
      })),
    }),

  updateCell: (rowIndex, colIndex, value) =>
    set((state) => {
      const rows = state.rows.map((row, i) =>
        i === rowIndex
          ? {
              ...row,
              values: row.values.map((v, j) => (j === colIndex ? value : v)),
            }
          : row,
      );
      return { ...state, rows };
    }),

  updateArticle: (rowIndex, newArticle) =>
    set((state) => {
      const rows = state.rows.map((row, i) =>
        i === rowIndex
          ? {
              ...row,
              article: newArticle,
            }
          : row,
      );
      return { ...state, rows };
    }),

  // 🔹 Добавление новой строки (новый артикул)
  addRow: () =>
    set((state) => {
      const values = state.dates.map(() => null);
      const newRow: MatrixRow = {
        originalArticle: "", // пусто → это новый артикул, не из БД
        article: "",
        values,
      };

      return {
        ...state,
        rows: [...state.rows, newRow],
      };
    }),

  // 🔹 Формируем payload для bulkUpsert
  toPayload: () => {
    const { dates, rows } = get();
    const entries: { date: string; article: string; qty: number }[] = [];

    for (const row of rows) {
      const article = row.article.trim();
      if (!article) continue; // новые пустые строки игнорируем

      row.values.forEach((v, idx) => {
        entries.push({
          date: dates[idx],
          article,
          qty: v ?? 0,
        });
      });
    }

    return { entries };
  },

  // 🔹 Какие артикулы надо переименовать (старый → новый)
  getRenames: () => {
    const { rows } = get();
    const renames: RenamePayload[] = [];

    for (const row of rows) {
      const original = row.originalArticle?.trim();
      const current = row.article.trim();

      // Новые строки (originalArticle === "") пропускаем
      if (!original) continue;

      if (original !== current && current) {
        renames.push({
          oldArticle: original,
          newArticle: current,
        });
      }
    }

    return renames;
  },
}));
