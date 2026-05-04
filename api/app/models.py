from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class PropertyType(str, Enum):
    string = "string"
    number = "number"
    boolean = "boolean"
    object = "object"
    array = "array"


class PropertyDef(BaseModel):
    name: str = Field(min_length=1)
    type: PropertyType = PropertyType.string
    required: bool = False
    description: str | None = None


class ClassRelationDef(BaseModel):
    name: str = Field(min_length=1)
    from_class: str = Field(min_length=1)
    to_class: str = Field(min_length=1)
    cardinality: str | None = None


class ClassDef(BaseModel):
    name: str = Field(min_length=1)
    properties: list[PropertyDef] = Field(default_factory=list)
    relations: list[ClassRelationDef] = Field(default_factory=list)


class ObjectRelation(BaseModel):
    name: str = Field(min_length=1)
    from_object: str = Field(min_length=1)
    to_object: str = Field(min_length=1)


class ObjectInstance(BaseModel):
    name: str = Field(min_length=1)
    class_name: str = Field(min_length=1)
    properties: dict[str, Any] = Field(default_factory=dict)
    relations: list[ObjectRelation] = Field(default_factory=list)


class Level1State(BaseModel):
    classes: list[ClassDef] = Field(default_factory=list)


class Level2State(BaseModel):
    objects: list[ObjectInstance] = Field(default_factory=list)


class IngestRequest(BaseModel):
    text: str = Field(min_length=1)


class IngestSuggestion(BaseModel):
    add_classes: list[ClassDef] = Field(default_factory=list)
    update_classes: list[ClassDef] = Field(default_factory=list)
    add_objects: list[ObjectInstance] = Field(default_factory=list)
    update_objects: list[ObjectInstance] = Field(default_factory=list)


class ApplyIngestRequest(BaseModel):
    suggestion: IngestSuggestion

