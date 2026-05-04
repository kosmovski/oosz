export type PropertyType = "string" | "number" | "boolean" | "object" | "array";

export type PropertyDef = {
  name: string;
  type: PropertyType;
  required: boolean;
  description?: string | null;
};

export type ClassRelationDef = {
  name: string;
  from_class: string;
  to_class: string;
  cardinality?: string | null;
};

export type ClassDef = {
  name: string;
  properties: PropertyDef[];
  relations: ClassRelationDef[];
};

export type ObjectRelation = {
  name: string;
  from_object: string;
  to_object: string;
};

export type ObjectInstance = {
  name: string;
  class_name: string;
  properties: Record<string, unknown>;
  relations: ObjectRelation[];
};

export type IngestSuggestion = {
  add_classes: ClassDef[];
  update_classes: ClassDef[];
  add_objects: ObjectInstance[];
  update_objects: ObjectInstance[];
};

