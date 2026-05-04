from __future__ import annotations

import re

from app.models import ClassDef, ClassRelationDef, IngestSuggestion, ObjectInstance, ObjectRelation
from app.services.model_service import ModelService


class IngestService:
    def __init__(self, model_service: ModelService) -> None:
        self._model = model_service

    def suggest_from_text(self, text: str) -> IngestSuggestion:
        suggestion = IngestSuggestion()

        class_relation_defs = self._extract_class_relations(text)
        class_names = self._extract_class_names(text) + [
            c for rel in class_relation_defs for c in (rel[0], rel[2])
        ]
        for name in class_names:
            try:
                self._model.get_class(name)
            except Exception:
                if not any(c.name == name for c in suggestion.add_classes):
                    suggestion.add_classes.append(ClassDef(name=name))

        object_relation_defs = self._extract_object_relations(text)
        object_defs = self._extract_objects(text)
        object_names = [n for rel in object_relation_defs for n in (rel[0], rel[2])]
        for obj_name in object_names:
            if any(o.name == obj_name for o in suggestion.add_objects):
                continue
            try:
                self._model.get_object(obj_name)
            except Exception:
                pass

        for obj_name, class_name in object_defs:
            try:
                self._model.get_object(obj_name)
            except Exception:
                if not any(o.name == obj_name for o in suggestion.add_objects):
                    suggestion.add_objects.append(ObjectInstance(name=obj_name, class_name=class_name))

        add_class_by_name = {c.name: c for c in suggestion.add_classes}
        update_class_by_name: dict[str, ClassDef] = {}
        for from_class, rel_name, to_class in class_relation_defs:
            base = add_class_by_name.get(from_class)
            if base:
                if not any(
                    r.name == rel_name and r.from_class == from_class and r.to_class == to_class
                    for r in base.relations
                ):
                    base.relations.append(
                        ClassRelationDef(
                            name=rel_name,
                            from_class=from_class,
                            to_class=to_class,
                        )
                    )
                continue

            try:
                existing = self._model.get_class(from_class)
            except Exception:
                continue

            next_cls = update_class_by_name.get(from_class)
            if not next_cls:
                next_cls = ClassDef.model_validate(existing.model_dump())
                update_class_by_name[from_class] = next_cls
            if not any(
                r.name == rel_name and r.from_class == from_class and r.to_class == to_class
                for r in next_cls.relations
            ):
                next_cls.relations.append(
                    ClassRelationDef(
                        name=rel_name,
                        from_class=from_class,
                        to_class=to_class,
                    )
                )

        suggestion.update_classes.extend(update_class_by_name.values())

        add_obj_by_name = {o.name: o for o in suggestion.add_objects}
        update_obj_by_name: dict[str, ObjectInstance] = {}
        for from_obj, rel_name, to_obj in object_relation_defs:
            rel = ObjectRelation(name=rel_name, from_object=from_obj, to_object=to_obj)
            base_obj = add_obj_by_name.get(from_obj)
            if base_obj:
                if not any(
                    r.name == rel.name and r.from_object == rel.from_object and r.to_object == rel.to_object
                    for r in base_obj.relations
                ):
                    base_obj.relations.append(rel)
                continue

            try:
                existing_obj = self._model.get_object(from_obj)
            except Exception:
                continue

            next_obj = update_obj_by_name.get(from_obj)
            if not next_obj:
                next_obj = ObjectInstance.model_validate(existing_obj.model_dump())
                update_obj_by_name[from_obj] = next_obj
            if not any(
                r.name == rel.name and r.from_object == rel.from_object and r.to_object == rel.to_object
                for r in next_obj.relations
            ):
                next_obj.relations.append(rel)

        suggestion.update_objects.extend(update_obj_by_name.values())

        return suggestion

    def apply_suggestion(self, suggestion: IngestSuggestion) -> None:
        for c in suggestion.add_classes:
            self._model.upsert_class(c)
        for c in suggestion.update_classes:
            self._model.upsert_class(c)
        for o in suggestion.add_objects:
            self._model.upsert_object(o)
        for o in suggestion.update_objects:
            self._model.upsert_object(o)

    @staticmethod
    def _extract_class_names(text: str) -> list[str]:
        patterns = [
            r"^\s*(?:Class|class)\s*:\s*(?P<name>[A-Za-z_][\w\-]*)\s*$",
            r"^\s*(?:Клас|клас)\s*:\s*(?P<name>[\w\-]+)\s*$",
        ]
        names: list[str] = []
        for line in text.splitlines():
            for p in patterns:
                m = re.match(p, line)
                if m:
                    names.append(m.group("name"))
        uniq: list[str] = []
        seen: set[str] = set()
        for n in names:
            if n not in seen:
                uniq.append(n)
                seen.add(n)
        return uniq

    @staticmethod
    def _extract_objects(text: str) -> list[tuple[str, str]]:
        patterns = [
            r"^\s*(?:Object|object)\s*:\s*(?P<obj>[A-Za-z_][\w\-]*)\s+is\s+(?P<class>[A-Za-z_][\w\-]*)\s*$",
            r"^\s*(?:Об['’]єкт|об['’]єкт)\s*:\s*(?P<obj>[\w\-]+)\s+є\s+(?P<class>[\w\-]+)\s*$",
        ]
        objs: list[tuple[str, str]] = []
        for line in text.splitlines():
            for p in patterns:
                m = re.match(p, line)
                if m:
                    objs.append((m.group("obj"), m.group("class")))
        uniq: list[tuple[str, str]] = []
        seen: set[str] = set()
        for o, c in objs:
            key = f"{o}::{c}"
            if key not in seen:
                uniq.append((o, c))
                seen.add(key)
        return uniq

    @staticmethod
    def _extract_class_relations(text: str) -> list[tuple[str, str, str]]:
        patterns = [
            r"^\s*(?:ClassRelation|class_relation)\s*:\s*(?P<from>[A-Za-z_][\w\-]*)\s+(?P<name>[A-Za-z_][\w\-]*)\s+(?P<to>[A-Za-z_][\w\-]*)\s*$",
            r"^\s*(?:Зв['’]язок\s+класів|зв['’]язок\s+класів)\s*:\s*(?P<from>[\w\-]+)\s+(?P<name>[\w\-]+)\s+(?P<to>[\w\-]+)\s*$",
        ]
        rels: list[tuple[str, str, str]] = []
        for line in text.splitlines():
            for p in patterns:
                m = re.match(p, line)
                if m:
                    rels.append((m.group("from"), m.group("name"), m.group("to")))
        uniq: list[tuple[str, str, str]] = []
        seen: set[str] = set()
        for f, n, t in rels:
            key = f"{f}::{n}::{t}"
            if key not in seen:
                uniq.append((f, n, t))
                seen.add(key)
        return uniq

    @staticmethod
    def _extract_object_relations(text: str) -> list[tuple[str, str, str]]:
        patterns = [
            r"^\s*(?:ObjectRelation|object_relation)\s*:\s*(?P<from>[A-Za-z_][\w\-]*)\s+(?P<name>[A-Za-z_][\w\-]*)\s+(?P<to>[A-Za-z_][\w\-]*)\s*$",
            r"^\s*(?:Зв['’]язок\s+об['’]єктів|зв['’]язок\s+об['’]єктів)\s*:\s*(?P<from>[\w\-]+)\s+(?P<name>[\w\-]+)\s+(?P<to>[\w\-]+)\s*$",
        ]
        rels: list[tuple[str, str, str]] = []
        for line in text.splitlines():
            for p in patterns:
                m = re.match(p, line)
                if m:
                    rels.append((m.group("from"), m.group("name"), m.group("to")))
        uniq: list[tuple[str, str, str]] = []
        seen: set[str] = set()
        for f, n, t in rels:
            key = f"{f}::{n}::{t}"
            if key not in seen:
                uniq.append((f, n, t))
                seen.add(key)
        return uniq
