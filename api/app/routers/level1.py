from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_model_service
from app.models import ClassDef
from app.services.model_service import ModelService


router = APIRouter(prefix="/level-1", tags=["level-1"])


@router.get("/classes")
def list_classes(
    q: str | None = None, model: ModelService = Depends(get_model_service)
) -> list[ClassDef]:
    return model.search_classes(q)


@router.post("/classes", status_code=201)
def create_class(
    cls: ClassDef, model: ModelService = Depends(get_model_service)
) -> ClassDef:
    try:
        model.get_class(cls.name)
        raise HTTPException(status_code=409, detail="class_already_exists")
    except HTTPException as e:
        if e.status_code != 404:
            raise
    return model.upsert_class(cls)


@router.get("/classes/{name}")
def get_class(name: str, model: ModelService = Depends(get_model_service)) -> ClassDef:
    return model.get_class(name)


@router.patch("/classes/{name}")
def update_class(
    name: str, cls: ClassDef, model: ModelService = Depends(get_model_service)
) -> ClassDef:
    if cls.name != name:
        raise HTTPException(status_code=400, detail="name_mismatch")
    return model.upsert_class(cls)


@router.delete("/classes/{name}", status_code=204)
def delete_class(name: str, model: ModelService = Depends(get_model_service)) -> None:
    model.delete_class(name)

