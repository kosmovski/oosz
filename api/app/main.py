from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.health import router as health_router
from app.routers.ingest import router as ingest_router
from app.routers.level1 import router as level1_router
from app.routers.level2 import router as level2_router
from app.routers.skills import router as skills_router
from app.routers.storage import router as storage_router
from app.services.ingest_service import IngestService
from app.services.model_service import ModelService
from app.store import JsonStore


def create_app() -> FastAPI:
    load_dotenv()

    app = FastAPI(title="Graph Model API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    data_dir = Path(os.environ.get("GRAPH_MODEL_DATA_DIR", str(Path(__file__).resolve().parents[2] / "data")))
    store = JsonStore(base_dir=data_dir)
    model_service = ModelService(store=store)
    model_service.load()

    app.state.model_service = model_service
    app.state.ingest_service = IngestService(model_service=model_service)

    app.include_router(health_router)
    app.include_router(level1_router)
    app.include_router(level2_router)
    app.include_router(ingest_router)
    app.include_router(skills_router)
    app.include_router(storage_router)

    return app


app = create_app()
