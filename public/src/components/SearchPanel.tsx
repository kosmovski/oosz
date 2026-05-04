import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

import { api } from "@/utils/api";
import type { ClassDef, ObjectInstance } from "@/types/model";

export default function SearchPanel() {
  const [q, setQ] = useState("");
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [objects, setObjects] = useState<ObjectInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  useEffect(() => {
    if (!canSearch) {
      setClasses([]);
      setObjects([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([api.listClasses(q.trim()), api.listObjects({ q: q.trim() })])
      .then(([c, o]) => {
        if (cancelled) return;
        setClasses(c);
        setObjects(o);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Не вдалося виконати пошук");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canSearch, q]);

  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-zinc-300">
          <Search size={18} />
        </div>
        <div className="flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Пошук класів і об’єктів за назвою (мін. 2 символи)"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </div>
        <div className="text-xs text-zinc-500">{loading ? "…" : canSearch ? "" : "—"}</div>
      </div>

      {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs font-medium text-zinc-400">Класи</div>
          <div className="mt-2 space-y-2">
            {classes.length === 0 ? (
              <div className="text-sm text-zinc-600">{canSearch ? "Нічого не знайдено" : "Введіть запит"}</div>
            ) : (
              classes.slice(0, 8).map((c) => (
                <Link
                  key={c.name}
                  to={`/level-1?select=${encodeURIComponent(c.name)}`}
                  className="block rounded-xl border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  {c.name}
                </Link>
              ))
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-zinc-400">Об’єкти</div>
          <div className="mt-2 space-y-2">
            {objects.length === 0 ? (
              <div className="text-sm text-zinc-600">{canSearch ? "Нічого не знайдено" : "Введіть запит"}</div>
            ) : (
              objects.slice(0, 8).map((o) => (
                <Link
                  key={o.name}
                  to={`/level-2?select=${encodeURIComponent(o.name)}`}
                  className="block rounded-xl border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{o.name}</span>
                    <span className="shrink-0 rounded-lg bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
                      {o.class_name}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

