from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException

from app.models import ClassDef, Level1State, Level2State, ObjectInstance
from app.store import JsonStore


@dataclass
class ModelFilenames:
    level1: str = "level1.json"
    level2: str = "level2.json"


class ModelService:
    def __init__(self, store: JsonStore, filenames: ModelFilenames | None = None) -> None:
        self._store = store
        self._filenames = filenames or ModelFilenames()
        self._level1 = Level1State()
        self._level2 = Level2State()
        self._class_by_name: dict[str, ClassDef] = {}
        self._object_by_name: dict[str, ObjectInstance] = {}

    def load(self) -> None:
        self._level1 = self._store.read_model(self._filenames.level1, Level1State)  # type: ignore[assignment]
        self._level2 = self._store.read_model(self._filenames.level2, Level2State)  # type: ignore[assignment]
        self._reindex()

    def save(self) -> None:
        self._store.write_model(self._filenames.level1, self._level1)
        self._store.write_model(self._filenames.level2, self._level2)

    def _reindex(self) -> None:
        self._class_by_name = {c.name: c for c in self._level1.classes}
        self._object_by_name = {o.name: o for o in self._level2.objects}

    def search_classes(self, q: str | None) -> list[ClassDef]:
        if not q:
            return list(self._level1.classes)
        ql = q.lower()
        return [c for c in self._level1.classes if ql in c.name.lower()]

    def get_class(self, name: str) -> ClassDef:
        c = self._class_by_name.get(name)
        if not c:
            raise HTTPException(status_code=404, detail="class_not_found")
        return c

    def upsert_class(self, cls: ClassDef) -> ClassDef:
        existing = self._class_by_name.get(cls.name)
        if existing:
            idx = self._level1.classes.index(existing)
            self._level1.classes[idx] = cls
        else:
            self._level1.classes.append(cls)
        self._reindex()
        return cls

    def delete_class(self, name: str) -> None:
        existing = self._class_by_name.get(name)
        if not existing:
            raise HTTPException(status_code=404, detail="class_not_found")
        self._level1.classes = [c for c in self._level1.classes if c.name != name]
        self._reindex()

    def search_objects(self, q: str | None, class_name: str | None) -> list[ObjectInstance]:
        objects = self._level2.objects
        if class_name:
            objects = [o for o in objects if o.class_name == class_name]
        if not q:
            return list(objects)
        ql = q.lower()
        return [o for o in objects if ql in o.name.lower()]

    def get_object(self, name: str) -> ObjectInstance:
        o = self._object_by_name.get(name)
        if not o:
            raise HTTPException(status_code=404, detail="object_not_found")
        return o

    def upsert_object(self, obj: ObjectInstance) -> ObjectInstance:
        if obj.class_name not in self._class_by_name:
            raise HTTPException(status_code=400, detail="unknown_class")

        prospective_objects = dict(self._object_by_name)
        prospective_objects[obj.name] = obj
        from_class = self._class_by_name[obj.class_name]
        allowed_relations = [r for r in from_class.relations if r.from_class == obj.class_name]

        for rel in obj.relations:
            if rel.from_object != obj.name:
                raise HTTPException(status_code=400, detail="relation_from_mismatch")
            if not rel.name or not rel.to_object:
                raise HTTPException(status_code=400, detail="invalid_relation")

            rel_def = next((r for r in allowed_relations if r.name == rel.name), None)
            if not rel_def:
                raise HTTPException(status_code=400, detail="invalid_relation")

            target = prospective_objects.get(rel.to_object)
            if not target:
                raise HTTPException(status_code=400, detail="unknown_target_object")
            if target.class_name != rel_def.to_class:
                raise HTTPException(status_code=400, detail="relation_target_class_mismatch")

        existing = self._object_by_name.get(obj.name)
        if existing:
            idx = self._level2.objects.index(existing)
            self._level2.objects[idx] = obj
        else:
            self._level2.objects.append(obj)
        self._reindex()
        return obj

    def delete_object(self, name: str) -> None:
        existing = self._object_by_name.get(name)
        if not existing:
            raise HTTPException(status_code=404, detail="object_not_found")
        self._level2.objects = [o for o in self._level2.objects if o.name != name]
        self._reindex()

    def get_level1(self) -> Level1State:
        return self._level1

    def get_level2(self) -> Level2State:
        return self._level2

    def apply_level1(self, state: Level1State) -> None:
        self._level1 = state
        self._reindex()

    def apply_level2(self, state: Level2State) -> None:
        self._level2 = state
        self._reindex()
