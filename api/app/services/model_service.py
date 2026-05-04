from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException

from app.models import (
    ClassDef,
    ClassRelationDef,
    Level1State,
    Level2State,
    ObjectInstance,
    ObjectRelation,
    PropertyDef,
    PropertyType,
    SkillSyncStats,
)
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

    @staticmethod
    def _merge_class(existing: ClassDef | None, incoming: ClassDef) -> ClassDef:
        if not existing:
            return incoming
        next_cls = ClassDef.model_validate(existing.model_dump())

        incoming_props_by_name = {p.name: p for p in incoming.properties}
        merged_props_by_name = {p.name: p for p in next_cls.properties}
        merged_props_by_name.update(incoming_props_by_name)
        next_cls.properties = list(merged_props_by_name.values())

        def rel_key(r: ClassRelationDef) -> str:
            return f"{r.from_class}::{r.name}::{r.to_class}"

        merged_rels_by_key = {rel_key(r): r for r in next_cls.relations}
        merged_rels_by_key.update({rel_key(r): r for r in incoming.relations})
        next_cls.relations = list(merged_rels_by_key.values())
        return next_cls

    def _ensure_class(self, name: str, stats: SkillSyncStats | None = None) -> None:
        if name in self._class_by_name:
            return
        self.upsert_class(ClassDef(name=name))
        if stats:
            stats.classes_created += 1

    def _ensure_class_relation(
        self, from_class: str, rel_name: str, to_class: str, stats: SkillSyncStats | None = None
    ) -> None:
        if not rel_name:
            return
        self._ensure_class(from_class, stats=None)
        self._ensure_class(to_class, stats=None)
        cls = self._class_by_name[from_class]
        if any(
            r.name == rel_name and r.from_class == from_class and r.to_class == to_class for r in cls.relations
        ):
            return
        next_cls = ClassDef.model_validate(cls.model_dump())
        next_cls.relations.append(ClassRelationDef(name=rel_name, from_class=from_class, to_class=to_class))
        self.upsert_class(next_cls)
        if stats:
            stats.class_relations_added += 1

    @staticmethod
    def _infer_property_type(value: Any) -> PropertyType:
        if isinstance(value, bool):
            return PropertyType.boolean
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return PropertyType.number
        if isinstance(value, list):
            return PropertyType.array
        if isinstance(value, dict):
            return PropertyType.object
        return PropertyType.string

    @staticmethod
    def _coerce_property_value(value: Any, prop_type: PropertyType) -> tuple[Any, bool]:
        if value is None:
            return None, False
        if prop_type == PropertyType.string:
            if isinstance(value, str):
                return value, False
            return str(value), True
        if prop_type == PropertyType.number:
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                return value, False
            if isinstance(value, str):
                t = value.strip()
                try:
                    if "." in t or "e" in t.lower():
                        return float(t), True
                    return int(t), True
                except Exception:
                    return None, True
            return None, True
        if prop_type == PropertyType.boolean:
            if isinstance(value, bool):
                return value, False
            if isinstance(value, str):
                t = value.strip().lower()
                if t in {"true", "1", "yes", "y", "так"}:
                    return True, True
                if t in {"false", "0", "no", "n", "ні"}:
                    return False, True
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                return bool(value), True
            return None, True
        if prop_type == PropertyType.array:
            if isinstance(value, list):
                return value, False
            return [value], True
        if prop_type == PropertyType.object:
            if isinstance(value, dict):
                return value, False
            return None, True
        return value, False

    def _maybe_augment_class_from_object_props(
        self,
        class_name: str,
        obj_props: dict[str, Any],
        augment_classes: bool,
        stats: SkillSyncStats | None,
    ) -> None:
        if not augment_classes:
            return
        if class_name not in self._class_by_name:
            return
        cls = self._class_by_name[class_name]
        existing_prop_names = {p.name for p in cls.properties}
        additions: list[PropertyDef] = []
        for k, v in obj_props.items():
            if k in existing_prop_names:
                continue
            additions.append(PropertyDef(name=k, type=self._infer_property_type(v), required=False))
        if not additions:
            return
        next_cls = ClassDef.model_validate(cls.model_dump())
        next_cls.properties.extend(additions)
        self.upsert_class(next_cls)
        if stats:
            stats.class_properties_added += len(additions)

    def _normalize_object_properties(
        self,
        obj: ObjectInstance,
        keep_extra_properties: bool,
        augment_classes: bool,
        stats: SkillSyncStats | None,
    ) -> ObjectInstance:
        props = obj.properties if isinstance(obj.properties, dict) else {}
        self._maybe_augment_class_from_object_props(
            class_name=obj.class_name,
            obj_props=props,
            augment_classes=augment_classes,
            stats=stats,
        )
        cls = self._class_by_name.get(obj.class_name)
        if not cls:
            return obj

        required_names = {p.name for p in cls.properties if p.required}
        next_props: dict[str, Any] = dict(props) if keep_extra_properties else {}

        for p in cls.properties:
            if p.name in props:
                coerced, changed = self._coerce_property_value(props.get(p.name), p.type)
                next_props[p.name] = coerced
                if stats and changed:
                    stats.object_properties_coerced += 1
            elif p.name in required_names:
                next_props[p.name] = None
                if stats:
                    stats.object_required_properties_filled += 1

        next_obj = ObjectInstance.model_validate(obj.model_dump())
        next_obj.properties = next_props
        return next_obj

    def reconcile(
        self,
        *,
        load_first: bool = False,
        augment_classes: bool = True,
        keep_extra_properties: bool = True,
        save: bool = False,
        stats: SkillSyncStats | None = None,
    ) -> None:
        if load_first:
            self.load()

        for obj in list(self._level2.objects):
            self._ensure_class(obj.class_name, stats=None)

        next_objects: list[ObjectInstance] = []
        for obj in self._level2.objects:
            next_obj = self._normalize_object_properties(
                obj=obj,
                keep_extra_properties=keep_extra_properties,
                augment_classes=augment_classes,
                stats=stats,
            )
            filtered_relations: list[ObjectRelation] = []
            for rel in next_obj.relations:
                if not rel.name or not rel.to_object:
                    if stats:
                        stats.object_relations_dropped += 1
                    continue
                if rel.from_object != next_obj.name:
                    rel = ObjectRelation(name=rel.name, from_object=next_obj.name, to_object=rel.to_object)
                target = self._object_by_name.get(rel.to_object)
                if not target:
                    if stats:
                        stats.object_relations_dropped += 1
                    continue
                self._ensure_class_relation(
                    from_class=next_obj.class_name,
                    rel_name=rel.name,
                    to_class=target.class_name,
                    stats=stats if augment_classes else None,
                )
                from_cls = self._class_by_name.get(next_obj.class_name)
                if not from_cls:
                    if stats:
                        stats.object_relations_dropped += 1
                    continue
                rel_def = next(
                    (r for r in from_cls.relations if r.from_class == next_obj.class_name and r.name == rel.name),
                    None,
                )
                if not rel_def or rel_def.to_class != target.class_name:
                    if stats:
                        stats.object_relations_dropped += 1
                    continue
                filtered_relations.append(rel)
            next_obj.relations = filtered_relations
            next_objects.append(next_obj)

        self._level2.objects = next_objects
        self._reindex()

        if save:
            self.save()

    def sync_from_skill(
        self,
        *,
        classes: list[ClassDef],
        objects: list[ObjectInstance],
        load_first: bool = True,
        reconcile: bool = True,
        augment_classes: bool = True,
        keep_extra_properties: bool = True,
        save: bool = True,
    ) -> SkillSyncStats:
        if load_first:
            self.load()

        stats = SkillSyncStats()

        uniq_classes: dict[str, ClassDef] = {}
        for c in classes:
            uniq_classes[c.name] = c
        uniq_objects: dict[str, ObjectInstance] = {}
        for o in objects:
            uniq_objects[o.name] = o

        for c in uniq_classes.values():
            if c.name in self._class_by_name:
                stats.classes_updated += 1
            else:
                stats.classes_created += 1
            merged = self._merge_class(self._class_by_name.get(c.name), c)
            self.upsert_class(merged)

        for o in uniq_objects.values():
            self._ensure_class(o.class_name, stats=stats)

        for o in uniq_objects.values():
            base = ObjectInstance(
                name=o.name,
                class_name=o.class_name,
                properties=o.properties if isinstance(o.properties, dict) else {},
                relations=[],
            )
            base = self._normalize_object_properties(
                obj=base,
                keep_extra_properties=keep_extra_properties,
                augment_classes=augment_classes,
                stats=stats,
            )
            if base.name in self._object_by_name:
                stats.objects_updated += 1
            else:
                stats.objects_created += 1
            self.upsert_object(base)

        for o in uniq_objects.values():
            current = self._object_by_name.get(o.name)
            if not current:
                continue
            next_obj = ObjectInstance.model_validate(current.model_dump())
            relations: list[ObjectRelation] = []
            for rel in o.relations:
                if not rel.name or not rel.to_object:
                    stats.object_relations_dropped += 1
                    continue
                target = self._object_by_name.get(rel.to_object)
                if not target:
                    stats.object_relations_dropped += 1
                    continue
                self._ensure_class_relation(
                    from_class=next_obj.class_name,
                    rel_name=rel.name,
                    to_class=target.class_name,
                    stats=stats if augment_classes else None,
                )
                relations.append(
                    ObjectRelation(name=rel.name, from_object=next_obj.name, to_object=target.name)
                )
            next_obj.relations = relations
            self.upsert_object(next_obj)

        if reconcile:
            self.reconcile(
                augment_classes=augment_classes,
                keep_extra_properties=keep_extra_properties,
                save=False,
                stats=stats,
            )

        if save:
            self.save()

        return stats
