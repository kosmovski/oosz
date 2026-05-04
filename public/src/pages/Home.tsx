import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, Save } from "lucide-react";

import SearchPanel from "@/components/SearchPanel";
import { api } from "@/utils/api";

export default function Home() {
  const [status, setStatus] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ classes: number; objects: number } | null>(null);

  useEffect(() => {
    Promise.all([api.listClasses(), api.listObjects()]).then(([classes, objects]) => {
      setCounts({ classes: classes.length, objects: objects.length });
    });
  }, []);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4">
          <div className="text-xs font-medium text-zinc-400">Стан моделі</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {counts ? (
              <span>
                {counts.classes} <span className="text-zinc-500">класів</span>
              </span>
            ) : (
              <span className="text-zinc-600">…</span>
            )}
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            {counts ? `${counts.objects} об’єктів` : "Завантаження"}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-zinc-400">Файлове сховище</div>
              <div className="mt-1 text-sm text-zinc-500">Збереження/завантаження рівнів 1–2</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setStatus(null);
                  api
                    .load()
                    .then((res) => {
                      setCounts({ classes: res.level1.classes.length, objects: res.level2.objects.length });
                      setStatus("Завантажено з файлів");
                    })
                    .catch(() => setStatus("Помилка завантаження"));
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
              >
                <RefreshCw size={16} />
                Завантажити
              </button>
              <button
                onClick={() => {
                  setStatus(null);
                  api
                    .save()
                    .then(() => setStatus("Збережено у файли"))
                    .catch(() => setStatus("Помилка збереження"));
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500"
              >
                <Save size={16} />
                Зберегти
              </button>
            </div>
          </div>
          {status ? <div className="mt-3 text-sm text-zinc-300">{status}</div> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link
          to="/level-1"
          className="group rounded-2xl border border-zinc-900 bg-zinc-950 p-4 hover:bg-zinc-900"
        >
          <div className="text-xs font-medium text-zinc-400">Рівень 1</div>
          <div className="mt-2 text-lg font-semibold">Класи та зв’язки</div>
          <div className="mt-1 text-sm text-zinc-500">Схема, властивості, типи зв’язків</div>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-sky-300">
            Відкрити <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
          </div>
        </Link>

        <Link
          to="/level-2"
          className="group rounded-2xl border border-zinc-900 bg-zinc-950 p-4 hover:bg-zinc-900"
        >
          <div className="text-xs font-medium text-zinc-400">Рівень 2</div>
          <div className="mt-2 text-lg font-semibold">Об’єкти та факти</div>
          <div className="mt-1 text-sm text-zinc-500">Екземпляри, значення, зв’язки між об’єктами</div>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-sky-300">
            Відкрити <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
          </div>
        </Link>

        <Link
          to="/ingest"
          className="group rounded-2xl border border-zinc-900 bg-zinc-950 p-4 hover:bg-zinc-900"
        >
          <div className="text-xs font-medium text-zinc-400">Пайплайн</div>
          <div className="mt-2 text-lg font-semibold">Текст → граф</div>
          <div className="mt-1 text-sm text-zinc-500">Генерація/перевірка/оновлення моделі на основі тексту</div>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-sky-300">
            Відкрити <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
          </div>
        </Link>
      </section>

      <section>
        <SearchPanel />
      </section>
    </div>
  );
}
