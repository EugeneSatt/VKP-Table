"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../lib/apiClient";
import {
  useScheduleStore,
  ScheduleMatrixFromBackend,
} from "../store/scheduleStore";

const DAYS = 30;

export function ScheduleTable() {
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [file, setFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  const setFromServer = useScheduleStore((s) => s.setFromServer);
  const dates = useScheduleStore((s) => s.dates);
  const rows = useScheduleStore((s) => s.rows);
  const updateCell = useScheduleStore((s) => s.updateCell);
  const updateArticle = useScheduleStore((s) => s.updateArticle);
  const addRow = useScheduleStore((s) => s.addRow);
  const toPayload = useScheduleStore((s) => s.toPayload);
  const getRenames = useScheduleStore((s) => s.getRenames);

  // 1) Тянем матрицу с бэка
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ["schedule", startDate, DAYS],
    queryFn: () =>
      apiGet<ScheduleMatrixFromBackend>("/schedule", {
        startDate,
        days: DAYS,
      }),
  });

  // 2) Карта оригинальных значений: article -> date -> qty
  const originalValues = useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {};

    if (!data || !data.rows || !data.dates) return map;

    // data.rows: { article: string; values: (number | null)[] }[]
    // data.dates: string[] (YYYY-MM-DD)
    for (const row of data.rows) {
      const art = row.article.toUpperCase();
      if (!map[art]) map[art] = {};

      data.dates.forEach((dateKey, idx) => {
        const v = row.values[idx] ?? null;
        map[art][dateKey] = v;
      });
    }

    return map;
  }, [data]);

  // 3) Сбрасываем стор из ответа сервера
  useEffect(() => {
    if (data) {
      setFromServer(data);
    }
  }, [data, setFromServer]);

  // 4) Сохранение изменений (ручное редактирование)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const renames = getRenames();

      // 1. Переименовать артикулы, которые уже есть в БД
      await Promise.all(
        renames.map((r) =>
          apiPost("/schedule/rename-article", {
            oldArticle: r.oldArticle,
            newArticle: r.newArticle,
          }),
        ),
      );

      // 2. Сохранить qty (включая новые артикули)
      const payload = toPayload();
      await apiPost("/schedule/bulk", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["schedule", startDate, DAYS],
      });
    },
  });

  // 5) Загрузка Excel
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Выбери файл Excel перед загрузкой");
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:3001/schedule/upload-excel", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ошибка загрузки: ${res.status} ${text}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["schedule", startDate, DAYS],
      });
      setFile(null);
    },
  });

  if (isLoading) {
    return <div className="p-4">Загружаю таблицу…</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-red-400">
        Ошибка загрузки: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 ">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex flex-col text-sm text-slate-300">
          Стартовая дата (30 дней):
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-slate-100"
          />
        </label>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="cursor-pointer inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-sm font-semibold"
        >
          {saveMutation.isPending ? "Сохраняю…" : "Сохранить изменения"}
        </button>

        <button
          type="button"
          onClick={() => addRow()}
          className="cursor-pointer mt-5 inline-flex items-center px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-semibold"
        >
          + Добавить артикул
        </button>

        <div className="flex items-center gap-2 mt-5">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
            }}
            className="cursor-pointer block text-sm text-slate-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
          />
          <button
            type="button"
            onClick={() => uploadMutation.mutate()}
            disabled={!file || uploadMutation.isPending}
            className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-sm font-semibold"
          >
            {uploadMutation.isPending ? "Загружаю Excel…" : "Загрузить Excel"}
          </button>
        </div>
      </div>

      {uploadMutation.isError && (
        <div className="text-sm text-red-400">
          {(uploadMutation.error as Error).message}
        </div>
      )}
      {uploadMutation.isSuccess && (
        <div className="text-sm text-emerald-400">
          Excel импортирован, таблица обновлена.
        </div>
      )}

      {/* Легенда подсветки */}
      <div className="text-xs text-slate-400 flex gap-4">
        <div>
          <span className="inline-block w-3 h-3 align-middle bg-yellow-300 border border-slate-600 mr-1" />
          изменённые значения (отличаются от БД)
        </div>
        <div>
          <span className="inline-block w-3 h-3 align-middle bg-green-800 border border-slate-600 mr-1" />
          есть план, не менялся
        </div>
        <div>
          <span className="inline-block w-3 h-3 align-middle bg-white border border-slate-600 mr-1" />
          пусто
        </div>
      </div>

      <div className="overflow-auto border border-slate-800 rounded-lg max-h-[70vh]">
        <table className="min-w-full border-collapse text-sm text-white bg-white">
          <thead className="bg-slate-900 sticky top-0 z-10">
            <tr>
              <th className="border border-slate-800 px-2 py-1 text-left">
                Артикул
              </th>
              {dates.map((d) => (
                <th
                  key={d}
                  className="border border-slate-800 px-2 py-1 text-center whitespace-nowrap"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.originalArticle + "-" + rowIndex}>
                <td className="border border-slate-800 px-2 py-1 bg-slate-900 sticky left-0 z-10 text-black">
                  <input
                    type="text"
                    className="w-32 bg-white border border-slate-700 rounded px-1 py-0.5"
                    value={row.article}
                    onChange={(e) =>
                      updateArticle(rowIndex, e.target.value.toUpperCase())
                    }
                    placeholder="Новый артикул"
                  />
                  {row.originalArticle && row.originalArticle !== row.article && (
                    <div className="text-[10px] text-amber-400 mt-0.5">
                      Было: {row.originalArticle}
                    </div>
                  )}
                </td>
                {row.values.map((value, colIndex) => {
                  const dateKey = dates[colIndex]; // "YYYY-MM-DD"
                  const articleKey = (
                    row.originalArticle ||
                    row.article ||
                    ""
                  ).toUpperCase();

                  const origForArticle = originalValues[articleKey] || {};
                  const origVal = origForArticle[dateKey] ?? null;
                  const currVal = value ?? null;

                  const isChanged =
                    (origVal === null && currVal !== null) ||
                    (origVal !== null && currVal === null) ||
                    (origVal !== null &&
                      currVal !== null &&
                      origVal !== currVal);

                  let bgClass = "bg-white text-black";
                  if (isChanged) {
                    bgClass = "bg-yellow-300 text-black"; // изменённая ячейка
                  } else if (currVal !== null && currVal !== 0) {
                    bgClass = "bg-green-800 text-white";
                  }

                  return (
                    <td
                      key={`${row.originalArticle || "NEW"}-${dateKey}-${colIndex}`}
                      className="border border-slate-800 px-1 py-0.5 text-center"
                    >
                      <input
                        type="number"
                        className={`w-20 rounded px-1 py-0.5 text-right ${bgClass}`}
                        value={currVal ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateCell(
                            rowIndex,
                            colIndex,
                            val === "" ? null : Number(val),
                          );
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={dates.length + 1}
                  className="text-center text-slate-500 py-4"
                >
                  Данных нет (по этой дате/диапазону ничего не нашлось)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {saveMutation.isError && (
        <div className="text-sm text-red-400">
          Ошибка сохранения: {(saveMutation.error as Error).message}
        </div>
      )}
      {saveMutation.isSuccess && (
        <div className="text-sm text-emerald-400">
          Изменения сохранены в базе.
        </div>
      )}
    </div>
  );
}
