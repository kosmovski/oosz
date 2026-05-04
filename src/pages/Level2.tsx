import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ElementDefinition } from "cytoscape";
import { Database, Plus, RefreshCw } from "lucide-react";

import ObjectEditor from "@/components/editors/ObjectEditor";
import GraphView from "@/components/graph/GraphView";
import { api } from "@/utils/api";
import type { ClassDef, ObjectInstance } from "@/types/model";

function objectToElements(objects: ObjectInstance[]): ElementDefinition[] {
  const nodes: ElementDefinition[] = objects.map((o) => ({
    data: { id: o.name, label: o.name, kind: "object", className: o.class_name },
  }));
  const edges: ElementDefinition[] = [];
  for (const o of objects) {
    for (const r of o.relations ?? []) {
      edges.push({
        data: {
          id: `${r.from_object}::${r.name}::${r.to_object}`,
          source: r.from_object,
          target: r.to_object,
          label: r.name,
          kind: "relation",
        },
      });
    }
  }
  return [...nodes, ...edges];
}

export default function Level2() {
  const [params, setParams] = useSearchParams();
  const selectedFromUrl = params.get("select");
  const [q, setQ] = useState("");
  const [className, setClassName] = useState<string | undefined>(undefined);
  const [objects, setObjects] = useState<ObjectInstance[]>([]);
  const [allObjects, setAllObjects] = useState<ObjectInstance[]>([]);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(selectedFromUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newObjectName, setNewObjectName] = useState("");
  const [newObjectClass, setNewObjectClass] = useState<string>("");
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
    Promise.all([
      api.listObjects({ q: q.trim() ? q.trim() : undefined, className }),
      api.listObjects(),
      api.listClasses(),
    ])
      .then(([viewObjects, allObjectsRes, classesRes]) => {
        setObjects(viewObjects);
        setAllObjects(allObjectsRes);
        setClasses(classesRes);
        if (!newObjectClass && classesRes.length > 0) setNewObjectClass(classesRes[0].name);
      })
      .catch(() => setError("Не вдалося завантажити дані"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, [q, className]);

  const elements = useMemo(() => objectToElements(objects), [objects]);
  const selected = useMemo(
    () => (selectedId ? allObjects.find((o) => o.name === selectedId) ?? null : null),
    [allObjects, selectedId],
  );

  const classOptions = useMemo(() => {
    return classes.map((c) => c.name).sort((a, b) => a.localeCompare(b));
  }, [classes]);

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_320px]">
      <aside className="rounded-2xl border border-zinc-900 bg-zinc-950 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-zinc-200">
            <Database size={16} />
            Об’єкти
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
          <div className="text-xs font-medium text-zinc-400">Додати об’єкт</div>
          <div className="mt-2 space-y-2">
            <input
              value={newObjectName}
              onChange={(e) => setNewObjectName(e.target.value)}
              placeholder="Name"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <select
              value={newObjectClass}
              onChange={(e) => setNewObjectClass(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              {classOptions.length === 0 ? <option value="">(Спочатку створіть клас)</option> : null}
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const name = newObjectName.trim();
                if (!name || !newObjectClass) return;
                setCreating(true);
                setCreateStatus(null);
                api
                  .createObject({ name, class_name: newObjectClass, properties: {}, relations: [] })
                  .then(() => api.save())
                  .then(() => {
                    setNewObjectName("");
                    setCreateStatus("Створено");
                    setSelected(name);
                    reload();
                  })
                  .catch(() => setCreateStatus("Помилка створення"))
                  .finally(() => setCreating(false));
              }}
              disabled={creating || !newObjectClass}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
            >
              <Plus size={16} />
              Додати
            </button>
            {createStatus ? <div className="text-xs text-zinc-500">{createStatus}</div> : null}
          </div>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Фільтр за назвою"
          className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />

        <select
          value={className ?? ""}
          onChange={(e) => setClassName(e.target.value ? e.target.value : undefined)}
          className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        >
          <option value="">Усі класи</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="mt-3 space-y-2">
          {loading ? <div className="text-sm text-zinc-600">Завантаження…</div> : null}
          {error ? <div className="text-sm text-rose-300">{error}</div> : null}
          {!loading && !error && objects.length === 0 ? (
            <div className="text-sm text-zinc-600">Порожньо</div>
          ) : null}
          {objects.map((o) => (
            <button
              key={o.name}
              onClick={() => {
                setParams((p) => {
                  p.set("select", o.name);
                  return p;
                });
              }}
              className={[
                "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                selectedId === o.name
                  ? "border-sky-700 bg-sky-950/40 text-zinc-100"
                  : "border-zinc-900 bg-zinc-950 text-zinc-300 hover:bg-zinc-900",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{o.name}</span>
                <span className="shrink-0 rounded-lg bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
                  {o.class_name}
                </span>
              </div>
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
          <div className="mt-2 text-sm text-zinc-600">Оберіть об’єкт у списку або на графі</div>
        ) : (
          <ObjectEditor
            selected={selected}
            allObjects={allObjects}
            classes={classes}
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
