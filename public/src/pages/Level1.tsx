import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ElementDefinition } from "cytoscape";
import { Network, Plus, RefreshCw } from "lucide-react";

import ClassEditor from "@/components/editors/ClassEditor";
import GraphView from "@/components/graph/GraphView";
import { api } from "@/utils/api";
import type { ClassDef } from "@/types/model";

function classToElements(classes: ClassDef[]): ElementDefinition[] {
  const nodes: ElementDefinition[] = classes.map((c) => ({
    data: { id: c.name, label: c.name, kind: "class" },
  }));
  const edges: ElementDefinition[] = [];
  for (const c of classes) {
    for (const r of c.relations ?? []) {
      edges.push({
        data: {
          id: `${r.from_class}::${r.name}::${r.to_class}`,
          source: r.from_class,
          target: r.to_class,
          label: r.name,
          kind: "relation",
        },
      });
    }
  }
  return [...nodes, ...edges];
}

export default function Level1() {
  const [params, setParams] = useSearchParams();
  const selectedFromUrl = params.get("select");
  const [q, setQ] = useState("");
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(selectedFromUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(selectedFromUrl);
  }, [selectedFromUrl]);

  const setSelected = (id: string | null) => {
    setSelectedId(id);
    if (!id) {
      setParams((p) => {
        p.delete("select");
        return p;
      });
      return;
    }
    setParams((p) => {
      p.set("select", id);
      return p;
    });
  };

  const reload = () => {
    setLoading(true);
    setError(null);
    api
      .listClasses(q.trim() ? q.trim() : undefined)
      .then((data) => setClasses(data))
      .catch(() => setError("Не вдалося завантажити класи"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, [q]);

  const elements = useMemo(() => classToElements(classes), [classes]);
  const selected = useMemo(
    () => (selectedId ? classes.find((c) => c.name === selectedId) ?? null : null),
    [classes, selectedId],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_320px]">
      <aside className="rounded-2xl border border-zinc-900 bg-zinc-950 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-zinc-200">
            <Network size={16} />
            Класи
          </div>
          <button
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
          >
            <RefreshCw size={14} />
            Оновити
          </button>
        </div>

        <div className="mt-3 rounded-2xl border border-zinc-900 bg-zinc-950 p-3">
          <div className="text-xs font-medium text-zinc-400">Додати клас</div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Name"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <button
              onClick={() => {
                const name = newClassName.trim();
                if (!name) return;
                setCreating(true);
                setCreateStatus(null);
                api
                  .createClass({ name, properties: [], relations: [] })
                  .then(() => api.save())
                  .then(() => {
                    setNewClassName("");
                    setCreateStatus("Створено");
                    setSelected(name);
                    reload();
                  })
                  .catch(() => setCreateStatus("Помилка створення"))
                  .finally(() => setCreating(false));
              }}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
            >
              <Plus size={16} />
              Додати
            </button>
          </div>
          {createStatus ? <div className="mt-2 text-xs text-zinc-500">{createStatus}</div> : null}
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Фільтр за назвою"
          className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />

        <div className="mt-3 space-y-2">
          {loading ? <div className="text-sm text-zinc-600">Завантаження…</div> : null}
          {error ? <div className="text-sm text-rose-300">{error}</div> : null}
          {!loading && !error && classes.length === 0 ? (
            <div className="text-sm text-zinc-600">Порожньо</div>
          ) : null}
          {classes.map((c) => (
            <button
              key={c.name}
              onClick={() => {
                setSelected(c.name);
              }}
              className={[
                "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                selectedId === c.name
                  ? "border-sky-700 bg-sky-950/40 text-zinc-100"
                  : "border-zinc-900 bg-zinc-950 text-zinc-300 hover:bg-zinc-900",
              ].join(" ")}
            >
              {c.name}
            </button>
          ))}
        </div>
      </aside>

      <section className="h-[72vh] min-h-[520px]">
        <GraphView
          elements={elements}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelected(id);
          }}
          layoutName="cose"
        />
      </section>

      <aside className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4">
        <div className="text-xs font-medium text-zinc-400">Деталі</div>
        {!selected ? (
          <div className="mt-2 text-sm text-zinc-600">Оберіть клас у списку або на графі</div>
        ) : (
          <ClassEditor
            selected={selected}
            classNames={classes.map((c) => c.name)}
            onChanged={(nextSelectedName) => {
              reload();
              setSelected(nextSelectedName ?? null);
            }}
          />
        )}
      </aside>
    </div>
  );
}
