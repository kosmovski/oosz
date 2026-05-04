import type { ClassDef, IngestSuggestion, ObjectInstance } from "@/types/model";

export type ApiError = { status: number; detail: unknown };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    throw { status: res.status, detail } satisfies ApiError;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  listClasses: (q?: string) =>
    request<ClassDef[]>(`/level-1/classes${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getClass: (name: string) =>
    request<ClassDef>(`/level-1/classes/${encodeURIComponent(name)}`),
  createClass: (cls: ClassDef) =>
    request<ClassDef>("/level-1/classes", { method: "POST", body: JSON.stringify(cls) }),
  updateClass: (cls: ClassDef) =>
    request<ClassDef>(`/level-1/classes/${encodeURIComponent(cls.name)}`, {
      method: "PATCH",
      body: JSON.stringify(cls),
    }),
  deleteClass: (name: string) =>
    request<void>(`/level-1/classes/${encodeURIComponent(name)}`, { method: "DELETE" }),

  listObjects: (params?: { q?: string; className?: string }) => {
    const qp = new URLSearchParams();
    if (params?.q) qp.set("q", params.q);
    if (params?.className) qp.set("class_name", params.className);
    const qs = qp.toString();
    return request<ObjectInstance[]>(`/level-2/objects${qs ? `?${qs}` : ""}`);
  },
  getObject: (name: string) =>
    request<ObjectInstance>(`/level-2/objects/${encodeURIComponent(name)}`),
  createObject: (obj: ObjectInstance) =>
    request<ObjectInstance>("/level-2/objects", { method: "POST", body: JSON.stringify(obj) }),
  updateObject: (obj: ObjectInstance) =>
    request<ObjectInstance>(`/level-2/objects/${encodeURIComponent(obj.name)}`, {
      method: "PATCH",
      body: JSON.stringify(obj),
    }),
  deleteObject: (name: string) =>
    request<void>(`/level-2/objects/${encodeURIComponent(name)}`, { method: "DELETE" }),

  ingestText: (text: string) =>
    request<IngestSuggestion>("/ingest/text", { method: "POST", body: JSON.stringify({ text }) }),
  applyIngest: (suggestion: IngestSuggestion) =>
    request<void>("/ingest/apply", { method: "POST", body: JSON.stringify({ suggestion }) }),

  save: () => request<{ status: string }>("/storage/save", { method: "POST" }),
  load: () => request<{ level1: { classes: ClassDef[] }; level2: { objects: ObjectInstance[] } }>(
    "/storage/load",
    { method: "POST" },
  ),
};

