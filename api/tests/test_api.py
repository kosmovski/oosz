import os
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def test_create_class_and_object(tmp_path: Path) -> None:
    os.environ["GRAPH_MODEL_DATA_DIR"] = str(tmp_path)
    app = create_app()
    client = TestClient(app)

    r = client.get("/health")
    assert r.status_code == 200

    r = client.post("/level-1/classes", json={"name": "Person", "properties": [], "relations": []})
    assert r.status_code == 201

    r = client.post("/level-2/objects", json={"name": "Alice", "class_name": "Person", "properties": {}, "relations": []})
    assert r.status_code == 201

    r = client.get("/level-1/classes?q=Per")
    assert r.status_code == 200
    assert any(c["name"] == "Person" for c in r.json())

    r = client.get("/level-2/objects?q=Ali")
    assert r.status_code == 200
    assert any(o["name"] == "Alice" for o in r.json())

    r = client.post("/storage/save")
    assert r.status_code == 200
    assert (tmp_path / "level1.json").exists()
    assert (tmp_path / "level2.json").exists()

