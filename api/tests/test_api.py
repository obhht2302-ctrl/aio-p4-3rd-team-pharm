"""뼈대 시험 — 요청 본문 · 기대 모양은 contracts/examples/api.json 을 그대로 쓴다.

DATABASE_URL이 있으면 같은 시험을 메모리 저장소와 PostgreSQL 저장소 양쪽에서 돌린다.
"""
import json
import os
from pathlib import Path
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from app import main
from app.store import MemoryStore, PgStore

EXAMPLES = json.loads((Path(__file__).resolve().parents[2] / "contracts/examples/api.json").read_text(encoding="utf-8"))
SUPPORT = json.loads((Path(__file__).resolve().parents[2] / "contracts/examples/support.json").read_text(encoding="utf-8"))
CONTRACT_KEYS = {"request_id", "route", "answer", "sources", "ticket", "agents", "security", "reason", "timings"}
STORE_KINDS = ["memory", "postgres"] if os.getenv("DATABASE_URL") else ["memory"]


@pytest.fixture(params=STORE_KINDS)
def client(request, monkeypatch):
    if request.param == "postgres":
        store = PgStore(os.environ["DATABASE_URL"])
        store.reset_for_tests()
    else:
        store = MemoryStore()
    monkeypatch.setattr(main, "STORE", store)
    monkeypatch.setenv("TEAM3_ENTRY_CODE", "test-code")
    monkeypatch.delenv("TEAM3_API_KEY", raising=False)
    return TestClient(main.app)


H = {"X-Entry-Code": "test-code"}


def as_user(name):  # 머리글은 ASCII만 → 화면처럼 퍼센트 인코딩
    return {**H, "X-User": quote(name)}


def test_health(client, request):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["store"] == ("postgres" if request.node.callspec.params["client"] == "postgres" else "memory")


def test_ask_needs_entry_code_and_saves_my_request(client, monkeypatch):
    async def fake_brain(body):
        return {**SUPPORT["responses"]["자동 답변"], "request_id": body["request_id"]}
    monkeypatch.setattr(main, "BRAIN", fake_brain)
    req = EXAMPLES["POST /api/ask"]["request"]
    assert client.post("/api/ask", json=req, headers={"X-Entry-Code": "wrong"}).status_code == 401
    resp = client.post("/api/ask", json=req, headers=H).json()
    assert CONTRACT_KEYS <= set(resp) and resp["route"] == "자동 답변"
    mine = client.get("/api/my-requests", params={"user": req["user"]}, headers=H).json()["items"]
    assert len(mine) == 1 and mine[0]["route"] == "자동 답변"
    assert client.get("/api/my-requests", params={"user": "윤서아"}, headers=H).json()["items"] == []


def test_brain_down_keeps_contract_shape(client, monkeypatch):
    async def broken(body):
        raise TimeoutError("n8n down")
    monkeypatch.setattr(main, "BRAIN", broken)
    resp = client.post("/api/ask", json=EXAMPLES["POST /api/ask"]["request"], headers=H).json()
    assert CONTRACT_KEYS <= set(resp) and resp["route"] == "담당자 이관" and resp["reason"] == "brain_down"


def test_tickets_idempotent_by_key(client):
    req = EXAMPLES["POST /tickets"]["request"]
    first, again = client.post("/tickets", json=req), client.post("/tickets", json=req)
    assert first.status_code == 201 and first.json() == EXAMPLES["POST /tickets"]["response"]
    assert again.status_code == 200 and again.json() == EXAMPLES["POST /tickets"]["response_duplicate"]


def test_admin_only_pharmacist_or_owner(client):
    assert client.get("/api/admin/tickets", headers=as_user("김하늘")).status_code == 403
    assert client.get("/api/admin/tickets", headers=as_user("최영순")).status_code == 403
    assert client.get("/api/admin/tickets", headers=as_user("이서준")).status_code == 200
    assert client.get("/api/admin/alerts", headers=as_user("정민재")).status_code == 200


def test_recall_notice_only_consenting_masked_no_drug_name(client):
    client.post("/tickets", json=EXAMPLES["POST /tickets"]["request"])
    url = "/api/admin/tickets/T-2003/recall-notice"
    assert client.post(url, headers=as_user("정민재")).status_code == 403  # 승인은 약사만
    body = client.post(url, headers=as_user("이서준")).json()
    want = EXAMPLES["POST /api/admin/tickets/{id}/recall-notice"]["response"]
    assert body["count"] == want["count"] and body["notices"] == want["notices"]  # C-002는 동의 안 함
    assert "010-0000" not in json.dumps(body) and "OTC-03" not in body["message"] and "시럽" not in body["message"]
