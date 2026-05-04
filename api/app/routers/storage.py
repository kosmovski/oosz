from __future__ import annotations

from fastapi import APIRouter, Depends

from app.deps import get_model_service
from app.models import Level1State, Level2State
from app.services.model_service import ModelService


router = APIRouter(prefix="/storage", tags=["storage"])


@router.post("/save")
def save(model: ModelService = Depends(get_model_service)) -> dict[str, str]:
    model.save()
    return {"status": "saved"}


@router.post("/load")
def load(model: ModelService = Depends(get_model_service)) -> dict[str, Level1State | Level2State]:
    model.load()
    return {"level1": model.get_level1(), "level2": model.get_level2()}

