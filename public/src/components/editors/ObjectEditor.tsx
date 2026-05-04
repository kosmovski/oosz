import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ClassDef, ObjectInstance, ObjectRelation } from "@/types/model";
import { api, type ApiError } from "@/utils/api";

type ObjectEditorProps = {
  selected: ObjectInstance;
  allObjects: ObjectInstance[];
  classes: ClassDef[];
  onChanged: (nextSelectedName?: string) => void;
};

function cloneObject(obj: ObjectInstance): ObjectInstance {
  return {
    name: obj.name,
    class_name: obj.class_name,
    properties: { ...(obj.properties ?? {}) },
    relations: (obj.relations ?? []).map((r) => ({ ...r })),
  };
}

function safeJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true as const, value: JSON.parse(text) };
  } catch {
    return { ok: false as const, error: "Невалідний JSON" };
  }
}

export default function ObjectEditor({ selected, allObjects, classes, onChanged }: ObjectEditorProps) {
  const [draft, setDraft] = useState<ObjectInstance>(() => cloneObject(selected));
  const [propsText, setPropsText] = useState(() => JSON.stringify(selected.properties ?? {}, null, 2));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const classDef = useMemo(() => classes.find((c) => c.name === draft.class_name) ?? null, [classes, draft.class_name]);

  const allowed = useMemo(() => {
    if (!classDef) return [];
    return (classDef.relations ?? [])
      .filter((r) => r.from_class === draft.class_name && r.name.trim())
      .map((r) => ({ name: r.name, toClass: r.to_class }))
      .filter((r) => r.toClass.trim());
  }, [classDef, draft.class_name]);

  const [relName, setRelName] = useState<string>("");
  const relTargets = useMemo(() => {
    const a = allowed.find((x) => x.name === relName);
    if (!a) return [];
    return allObjects
      .filter((o) => o.name !== draft.name && o.class_name === a.toClass)
      .sort((x, y) => x.name.localeCompare(y.name));
  }, [allowed, allObjects, draft.name, relName]);

  const [relTarget, setRelTarget] = useState<string>("");

  useEffect(() => {
    setDraft(cloneObject(selected));
    setPropsText(JSON.stringify(selected.properties ?? {}, null, 2));
    setStatus(null);
    setRelName("");
    setRelTarget("");
  }, [selected.name]);

  useEffect(() => {
    setRelTarget("");
  }, [relName]);

  const save = () => {
    const parsed = safeJson(propsText);
    if (parsed.ok === false) {
      setStatus(parsed.error);
      return;
    }
    if (typeof parsed.value !== "object" || parsed.value === null || Array.isArray(parsed.value)) {
      setStatus("Властивості мають бути JSON-об’єктом");
      return;
    }
    const next: ObjectInstance = {
      ...draft,
      properties: parsed.value as Record<string, unknown>,
    };

    setSaving(true);
    setStatus(null);
    api
      .updateObject(next)
      .then(() => api.save())
      .then(() => setStatus("Збережено"))
      .then(() => onChanged(next.name))
      .catch((e: ApiError) => {
        const detail = typeof e?.detail === "string" ? e.detail : "Помилка збереження";
        setStatus(detail);
      })
      .finally(() => setSaving(false));
  };

  const del = () => {
    setSaving(true);
    setStatus(null);
    api
      .deleteObject(draft.name)
      .then(() => api.save())
      .then(() => onChanged())
      .catch(() => setStatus("Помилка видалення"))
      .finally(() => setSaving(false));
  };

  const addRelation = () => {
    const a = allowed.find((x) => x.name === relName);
    if (!a || !relTarget) return;
    const rel: ObjectRelation = { name: a.name, from_object: draft.name, to_object: relTarget };
    setDraft((d) => ({
      ...d,
      relations: d.relations.some(
        (r) => r.name === rel.name && r.from_object === rel.from_object && r.to_object === rel.to_object,
      )
        ? d.relations
        : [...d.relations, rel],
    }));
  };

  return (
    <div className="mt-2 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{draft.name}</div>
          <div className="mt-1 inline-flex items-center rounded-lg bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
            {draft.class_name}
          </div>
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
        <div className="text-xs font-medium text-zinc-400">Властивості (JSON-об’єкт)</div>
        <textarea
          value={propsText}
          onChange={(e) => setPropsText(e.target.value)}
          className="mt-2 h-40 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </div>

      <div>
        <div className="text-xs font-medium text-zinc-400">Зв’язки (згідно зв’язків класів)</div>

        <div className="mt-2 grid grid-cols-[1fr_1fr_84px] gap-2">
          <select
            value={relName}
            onChange={(e) => setRelName(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            <option value="">Оберіть тип зв’язку</option>
            {allowed.map((r) => (
              <option key={`${r.name}::${r.toClass}`} value={r.name}>
                {r.name} → {r.toClass}
              </option>
            ))}
          </select>
          <select
            value={relTarget}
            onChange={(e) => setRelTarget(e.target.value)}
            disabled={!relName}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-50"
          >
            <option value="">Цільовий об’єкт</option>
            {relTargets.map((o) => (
              <option key={o.name} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            onClick={addRelation}
            disabled={!relName || !relTarget}
            className="rounded-xl bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Додати
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {draft.relations.length === 0 ? <div className="text-sm text-zinc-600">Немає</div> : null}
          {draft.relations.map((r, idx) => (
            <div key={`${r.from_object}::${r.name}::${r.to_object}::${idx}`} className="rounded-xl border border-zinc-900 bg-zinc-950 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm text-zinc-200">{r.name}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {r.from_object} → {r.to_object}
                  </div>
                </div>
                <button
                  onClick={() => setDraft((d) => ({ ...d, relations: d.relations.filter((_, i) => i !== idx) }))}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
                >
                  Прибрати
                </button>
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
