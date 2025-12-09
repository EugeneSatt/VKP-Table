import { ScheduleTable } from "./schedule/ScheduleTable";

export default function HomePage() {
  return (
    <main className="p-6 relative overflow-x-hidden">
      <div className="bg-white rounded-2xl p-4 text-black">
      <h1 className="text-2xl font-bold mb-4 ">
        План выкупов
      </h1>
      <p className="text-sm  mb-4 ">
        Первый столбец — артикул, далее 30 дней. Любую ячейку кроме заголовков
        можно менять и сохранить через кнопку ниже.
      </p>
      </div>
      <ScheduleTable />
      <div className="top-0 left-0 backdrop-blur-md bg-white/10 p-6 rounded-xl min-h-full min-w-full fixed -z-1"></div>
    </main>
  );
}
