from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from pydantic import BaseModel


def _atomic_write(path: Path, data: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text(data, encoding="utf-8")
    os.replace(tmp_path, path)


class JsonStore:
    def __init__(self, base_dir: Path) -> None:
        self._base_dir = base_dir

    def read_model(self, filename: str, model: type[BaseModel]) -> BaseModel:
        path = self._base_dir / filename
        if not path.exists():
            return model()
        raw = json.loads(path.read_text(encoding="utf-8"))
        return model.model_validate(raw)

    def write_model(self, filename: str, instance: BaseModel) -> None:
        path = self._base_dir / filename
        data = json.dumps(instance.model_dump(mode="json"), ensure_ascii=False, indent=2)
        _atomic_write(path, data)

    def read_json(self, filename: str) -> dict[str, Any]:
        path = self._base_dir / filename
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8"))

