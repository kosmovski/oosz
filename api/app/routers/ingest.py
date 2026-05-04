from __future__ import annotations

from fastapi import APIRouter, Depends

from app.deps import get_ingest_service
from app.models import ApplyIngestRequest, IngestRequest, IngestSuggestion
from app.services.ingest_service import IngestService


router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/text")
def ingest_text(
    req: IngestRequest, ingest: IngestService = Depends(get_ingest_service)
) -> IngestSuggestion:
    return ingest.suggest_from_text(req.text)


@router.post("/apply", status_code=204)
def apply_ingest(
    req: ApplyIngestRequest, ingest: IngestService = Depends(get_ingest_service)
) -> None:
    ingest.apply_suggestion(req.suggestion)

