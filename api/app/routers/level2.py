from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_model_service
from app.models import ObjectInstance
from app.services.model_service import ModelService


router = APIRouter(prefix="/level-2", tags=["level-2"])


@router.get("/objects")
def list_objects(
    q: str | None = None,
    class_name: str | None = None,
    model: ModelService = Depends(get_model_service),
) -> list[ObjectInstance]:
    return model.search_objects(q=q, class_name=class_name)


@router.post("/objects", status_code=201)
def create_object(
    obj: ObjectInstance, model: ModelService = Depends(get_model_service)
) -> ObjectInstance:
    try:
        model.get_object(obj.name)
        raise HTTPException(status_code=409, detail="object_already_exists")
    except HTTPException as e:
        if e.status_code != 404:
            raise
    return model.upsert_object(obj)


@router.get("/objects/{name}")
def get_object(
    name: str, model: ModelService = Depends(get_model_service)
) -> ObjectInstance:
    return model.get_object(name)


@router.patch("/objects/{name}")
def update_object(
    name: str, obj: ObjectInstance, model: ModelService = Depends(get_model_service)
) -> ObjectInstance:
    if obj.name != name:
        raise HTTPException(status_code=400, detail="name_mismatch")
    return model.upsert_object(obj)


@router.delete("/objects/{name}", status_code=204)
def delete_object(name: str, model: ModelService = Depends(get_model_service)) -> None:
    model.delete_object(name)

