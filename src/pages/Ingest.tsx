import { useMemo, useState } from "react";
import { Check, Play, Save } from "lucide-react";

import { api } from "@/utils/api";
import type { IngestSuggestion } from "@/types/model";

export default function Ingest() {
  const [text, setText] = useState(
    [
      "Клас: Person",
      "Клас: Company",
      "Зв'язок класів: Person director Company",
      "Об'єкт: Alice є Person",
      "Об'єкт: Acme є Company",
      "Зв'язок об'єктів: Alice director Acme",
    ].join("\n"),
  );
  const [suggestion, setSuggestion] = useState<IngestSuggestion | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const summary = useMemo(() => {
    if (!suggestion) return null;
    return {
      addClasses: suggestion.add_classes.length,
      updClasses: suggestion.update_classes.length,
      addObjects: suggestion.add_objects.length,
      updObjects: suggestion.update_objects.length,
    };
  }, [suggestion]);

  const runSuggest = () => {
    setLoading(true);
    setStatus(null);
    api
      .ingestText(text)
      .then((s) => setSuggestion(s))
      .catch(() => setStatus("Помилка обробки тексту"))
      .finally(() => setLoading(false));
  };

  const apply = () => {
    if (!suggestion) return;
    setLoading(true);
    setStatus(null);
    api
      .applyIngest(suggestion)
      .then(() => api.save())
      .then(() => setStatus("Зміни застосовано і збережено у файли"))
      .catch(() => setStatus("Помилка застосування"))
      .finally(() => setLoading(false));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-zinc-200">Текст → пропозиції змін</div>
            <div className="mt-1 text-sm text-zinc-500">
              MVP: “Клас:”, “Об’єкт: X є Y”, “Зв'язок класів: A rel B”, “Зв'язок об'єктів: x rel y”.
            </div>
          </div>
          <button
            onClick={runSuggest}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
          >
            <Play size={16} />
            Згенерувати
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-4 h-[360px] w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />

        {status ? <div className="mt-3 text-sm text-zinc-300">{status}</div> : null}
      </section>

      <aside className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4">
        <div className="text-xs font-medium text-zinc-400">Результат</div>
        {!suggestion ? (
          <div className="mt-2 text-sm text-zinc-600">Запустіть генерацію, щоб побачити пропозиції</div>
        ) : (
          <div className="mt-2 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-3">
                <div className="text-xs text-zinc-500">Нові класи</div>
                <div className="mt-1 text-lg font-semibold">{summary?.addClasses ?? 0}</div>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-3">
                <div className="text-xs text-zinc-500">Нові об’єкти</div>
                <div className="mt-1 text-lg font-semibold">{summary?.addObjects ?? 0}</div>
              </div>
            </div>

            <button
              onClick={apply}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
            >
              <Check size={16} />
              Застосувати
            </button>

            <button
              onClick={() => {
                setLoading(true);
                setStatus(null);
                api
                  .save()
                  .then(() => setStatus("Збережено у файли"))
                  .catch(() => setStatus("Помилка збереження"))
                  .finally(() => setLoading(false));
              }}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
            >
              <Save size={16} />
              Зберегти без застосування
            </button>

            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-zinc-400">Нові класи</div>
                <div className="mt-2 space-y-2">
                  {suggestion.add_classes.length === 0 ? (
                    <div className="text-sm text-zinc-600">Немає</div>
                  ) : (
                    suggestion.add_classes.slice(0, 12).map((c) => (
                      <div key={c.name} className="rounded-xl border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm">
                        {c.name}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-zinc-400">Нові об’єкти</div>
                <div className="mt-2 space-y-2">
                  {suggestion.add_objects.length === 0 ? (
                    <div className="text-sm text-zinc-600">Немає</div>
                  ) : (
                    suggestion.add_objects.slice(0, 12).map((o) => (
                      <div
                        key={o.name}
                        className="rounded-xl border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate">{o.name}</div>
                          <div className="shrink-0 rounded-lg bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
                            {o.class_name}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
