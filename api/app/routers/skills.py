from __future__ import annotations

from fastapi import APIRouter, Depends

from app.deps import get_model_service
from app.models import SkillReconcileRequest, SkillSyncRequest, SkillSyncResponse
from app.services.model_service import ModelService


router = APIRouter(prefix="/skills", tags=["skills"])


@router.post("/sync")
def sync(req: SkillSyncRequest, model: ModelService = Depends(get_model_service)) -> SkillSyncResponse:
    stats = model.sync_from_skill(
        classes=req.classes,
        objects=req.objects,
        load_first=req.load_first,
        reconcile=req.reconcile,
        augment_classes=req.augment_classes,
        keep_extra_properties=req.keep_extra_properties,
        save=req.save,
    )
    return SkillSyncResponse(stats=stats, level1=model.get_level1(), level2=model.get_level2())


@router.post("/reconcile")
def reconcile(req: SkillReconcileRequest, model: ModelService = Depends(get_model_service)) -> SkillSyncResponse:
    stats = model.sync_from_skill(
        classes=[],
        objects=[],
        load_first=req.load_first,
        reconcile=True,
        augment_classes=req.augment_classes,
        keep_extra_properties=req.keep_extra_properties,
        save=req.save,
    )
    return SkillSyncResponse(stats=stats, level1=model.get_level1(), level2=model.get_level2())

