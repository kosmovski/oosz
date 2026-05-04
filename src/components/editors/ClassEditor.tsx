import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ClassDef, ClassRelationDef, PropertyDef, PropertyType } from "@/types/model";
import { api } from "@/utils/api";

type ClassEditorProps = {
  selected: ClassDef;
  classNames: string[];
  onChanged: (nextSelectedName?: string) => void;
};

const propertyTypes: PropertyType[] = ["string", "number", "boolean", "object", "array"];

function cloneClass(cls: ClassDef): ClassDef {
  return {
    name: cls.name,
    properties: cls.properties.map((p) => ({ ...p })),
    relations: cls.relations.map((r) => ({ ...r })),
  };
}

export default function ClassEditor({ selected, classNames, onChanged }: ClassEditorProps) {
  const [draft, setDraft] = useState<ClassDef>(() => cloneClass(selected));
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toClassOptions = useMemo(
    () => classNames.filter((n) => n !== draft.name).sort((a, b) => a.localeCompare(b)),
    [classNames, draft.name],
  );

  useEffect(() => {
    setDraft(cloneClass(selected));
    setStatus(null);
  }, [selected.name]);

  const save = () => {
    setSaving(true);
    setStatus(null);
    api
      .updateClass(draft)
      .then(() => api.save())
      .then(() => setStatus("Збережено"))
      .then(() => onChanged(draft.name))
      .catch(() => setStatus("Помилка збереження"))
      .finally(() => setSaving(false));
  };

  const del = () => {
    setSaving(true);
    setStatus(null);
    api
      .deleteClass(draft.name)
      .then(() => api.save())
      .then(() => onChanged())
      .catch(() => setStatus("Помилка видалення"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="mt-2 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{draft.name}</div>
          <div className="mt-1 text-xs text-zinc-500">Редагування властивостей і зв’язків класу</div>
        </div>
        <button
          onClick={del}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
        >
          <Trash2 size={16} />
          Видалити
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-zinc-400">Властивості</div>
          <button
            onClick={() =>
              setDraft((d) => ({
                ...d,
                properties: [
                  ...d.properties,
                  { name: "", type: "string", required: false, description: null } satisfies PropertyDef,
                ],
              }))
            }
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
          >
            Додати
          </button>
        </div>

        <div className="mt-2 space-y-2">
          {draft.properties.length === 0 ? <div className="text-sm text-zinc-600">Немає</div> : null}
          {draft.properties.map((p, idx) => (
            <div key={idx} className="rounded-xl border border-zinc-900 bg-zinc-950 p-3">
              <div className="grid grid-cols-[1fr_110px_90px_70px] items-center gap-2">
                <input
                  value={p.name}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      properties: d.properties.map((pp, i) => (i === idx ? { ...pp, name: e.target.value } : pp)),
                    }))
                  }
                  placeholder="name"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                <select
                  value={p.type}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      properties: d.properties.map((pp, i) =>
                        i === idx ? { ...pp, type: e.target.value as PropertyType } : pp,
                      ),
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  {propertyTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={p.required}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        properties: d.properties.map((pp, i) =>
                          i === idx ? { ...pp, required: e.target.checked } : pp,
                        ),
                      }))
                    }
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
                  />
                  required
                </label>
                <button
                  onClick={() =>
                    setDraft((d) => ({ ...d, properties: d.properties.filter((_, i) => i !== idx) }))
                  }
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
                >
                  Прибрати
                </button>
              </div>
              <input
                value={p.description ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    properties: d.properties.map((pp, i) =>
                      i === idx ? { ...pp, description: e.target.value || null } : pp,
                    ),
                  }))
                }
                placeholder="description (опційно)"
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-zinc-400">Зв’язки класу</div>
          <button
            onClick={() =>
              setDraft((d) => ({
                ...d,
                relations: [
                  ...d.relations,
                  {
                    name: "",
                    from_class: d.name,
                    to_class: toClassOptions[0] ?? "",
                    cardinality: null,
                  } satisfies ClassRelationDef,
                ],
              }))
            }
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
          >
            Додати
          </button>
        </div>

        <div className="mt-2 space-y-2">
          {draft.relations.length === 0 ? <div className="text-sm text-zinc-600">Немає</div> : null}
          {draft.relations.map((r, idx) => (
            <div key={idx} className="rounded-xl border border-zinc-900 bg-zinc-950 p-3">
              <div className="grid grid-cols-[1fr_1fr_80px] items-center gap-2">
                <input
                  value={r.name}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      relations: d.relations.map((rr, i) => (i === idx ? { ...rr, name: e.target.value } : rr)),
                    }))
                  }
                  placeholder="relation name"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                <select
                  value={r.to_class}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      relations: d.relations.map((rr, i) => (i === idx ? { ...rr, to_class: e.target.value } : rr)),
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  <option value="">to_class</option>
                  {toClassOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setDraft((d) => ({ ...d, relations: d.relations.filter((_, i) => i !== idx) }))}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
                >
                  Прибрати
                </button>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_1fr] gap-2">
                <div className="rounded-lg border border-zinc-900 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-300">
                  {draft.name} → {r.to_class || "—"}
                </div>
                <input
                  value={r.cardinality ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      relations: d.relations.map((rr, i) =>
                        i === idx ? { ...rr, cardinality: e.target.value || null } : rr,
                      ),
                    }))
                  }
                  placeholder="cardinality (опц.)"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-zinc-400">{status ?? ""}</div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
        >
          Зберегти
        </button>
      </div>
    </div>
  );
}
