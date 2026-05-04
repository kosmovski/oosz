import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

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


def test_skills_sync_and_reconcile(tmp_path: Path) -> None:
    os.environ["GRAPH_MODEL_DATA_DIR"] = str(tmp_path)
    app = create_app()
    client = TestClient(app)

    r = client.post(
        "/skills/sync",
        json={
            "classes": [
                {
                    "name": "Person",
                    "properties": [{"name": "age", "type": "number", "required": True, "description": None}],
                    "relations": [],
                },
                {"name": "Company", "properties": [], "relations": []},
            ],
            "objects": [
                {
                    "name": "Alice",
                    "class_name": "Person",
                    "properties": {"age": "31", "extra": "keep"},
                    "relations": [{"name": "works_at", "from_object": "Alice", "to_object": "Acme"}],
                },
                {"name": "Acme", "class_name": "Company", "properties": {}, "relations": []},
            ],
            "load_first": True,
            "reconcile": True,
            "augment_classes": True,
            "keep_extra_properties": True,
            "save": True,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["stats"]["classes_created"] >= 2
    assert body["stats"]["objects_created"] >= 2
    assert body["stats"]["class_relations_added"] >= 1
    assert body["stats"]["object_properties_coerced"] >= 1

    alice = client.get("/level-2/objects/Alice").json()
    assert alice["properties"]["age"] == 31
    assert alice["properties"]["extra"] == "keep"
    assert any(rel["name"] == "works_at" and rel["to_object"] == "Acme" for rel in alice["relations"])

    client.post("/storage/save")
    assert (tmp_path / "level1.json").exists()
    assert (tmp_path / "level2.json").exists()

    (tmp_path / "level1.json").write_text(
        '{"classes":[{"name":"Person","properties":[],"relations":[]}]}', encoding="utf-8"
    )
    (tmp_path / "level2.json").write_text(
        '{"objects":[{"name":"Alice","class_name":"Person","properties":{},"relations":[{"name":"knows","from_object":"Alice","to_object":"Bob"}]}]}',
        encoding="utf-8",
    )

    os.environ["GRAPH_MODEL_DATA_DIR"] = str(tmp_path)
    app2 = create_app()
    client2 = TestClient(app2)

    r = client2.post("/skills/reconcile", json={"load_first": True, "augment_classes": True, "keep_extra_properties": True, "save": False})
    assert r.status_code == 200
    body2 = r.json()
    assert body2["stats"]["object_relations_dropped"] == 1
    alice2 = client2.get("/level-2/objects/Alice").json()
    assert alice2["relations"] == []
