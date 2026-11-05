"""3팀 약국 업무 도우미 API (조합 C 뒷단). 경로 · 모양 = specs/03-backend.md 3절, 예시 = contracts/examples/api.json."""
from __future__ import annotations

import json
import os
import re
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .store import make_store

REPO = Path(os.getenv("TEAM3_REPO") or Path(__file__).resolve().parents[2])
STAFF_ROLES, ADMIN_ROLES = {"staff", "pharmacist", "owner", "patient"}, {"pharmacist", "owner"}
NOTICE_TEXT = "[가짜약국] 구매하신 의약품 안전 안내가 있습니다. 약국으로 연락 주세요."  # 약 이름을 넣지 않음 (잠금 화면 · 건강 정보)

app = FastAPI(title="team3 pharm api", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
                   allow_methods=["*"], allow_headers=["*"])
STORE = make_store(os.getenv("DATABASE_URL", ""))


def load(rel: str, default):
    path = REPO / rel
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def users() -> dict[str, dict]:
    return {u["name"]: u for u in load("data/users.json", [])}


def mask_phone(phone: str) -> str:
    return re.sub(r"(01\d)-?\d{3,4}-?(\d{4})", r"\1-****-\2", phone or "")


def mask_text(text: str) -> str:  # 질문 글자 속 전화번호 · 메일 가림 (약사 화면 목록용)
    return re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", "***@***", mask_phone(text or ""))


def need_entry(code: str | None) -> None:
    expected = os.getenv("TEAM3_ENTRY_CODE", "")
    if expected and code != expected:
        raise HTTPException(401, "입장 코드가 맞지 않아요")


def need_role(user: str | None, roles: set[str]) -> dict:
    person = users().get(unquote(user or ""))  # 머리글은 ASCII만 돼서 화면이 encodeURIComponent로 보냄
    if not person or person["role"] not in roles:
        raise HTTPException(403, "이 화면은 약사 · 약국장만 볼 수 있어요")
    return person


def need_api_key(key: str | None) -> None:
    expected = os.getenv("TEAM3_API_KEY", "")
    if expected and key != expected:
        raise HTTPException(401, "API 키가 맞지 않아요")


@app.exception_handler(HTTPException)
async def error_body(_: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


def fallback(request_id: str, reason: str = "brain_down") -> dict:
    """두뇌(n8n)가 멈췄을 때도 계약 모양으로 답한다 (fail-closed: 자동 답변하지 않음)."""
    return {"request_id": request_id, "route": "담당자 이관", "answer": "지금 도우미가 응답하지 않아요. 잠시 뒤 다시 물어봐 주세요.",
            "sources": [], "ticket": None, "agents": [], "security": {"blocked_by": "", "reason": "", "masked": 0},
            "reason": reason, "timings": {"total_ms": 0}}


async def call_brain(body: dict) -> dict:
    """[병훈님이 정함] timeout · 재시도. 지금은 15초 한 번."""
    url = os.getenv("N8N_WEBHOOK_URL", "")
    if not url:
        return fallback(body["request_id"], "brain_not_set")
    headers = {"X-Team-Key": os.getenv("N8N_WEBHOOK_KEY", "")}
    async with httpx.AsyncClient(timeout=float(os.getenv("N8N_TIMEOUT", "15"))) as client:
        resp = await client.post(url, json=body, headers=headers)
    return resp.json()


BRAIN = call_brain  # 시험에서 바꿔 끼움


@app.get("/health")
def health():
    return {"status": "ok", "store": STORE.name}


@app.get("/api/users")
def list_users():
    return {"items": [{"name": u["name"], "role": u["role"]} for u in users().values()]}


@app.get("/api/types")
def list_types():
    policy = load("config/type-policy.json", {"types": []})
    return {"items": [{"type": t["type"], "label": t["label"], "examples": t.get("examples", [])} for t in policy["types"]]}


@app.post("/api/ask")
async def ask(payload: dict, x_entry_code: str | None = Header(default=None)):
    need_entry(x_entry_code)
    user, question = str(payload.get("user", "")), str(payload.get("question", ""))
    if user not in users():
        raise HTTPException(400, "사용자를 먼저 골라 주세요")
    body = {"request_id": f"web-{uuid.uuid4().hex[:8]}", "user": user, "channel": "web", "question": question,
            "attempt": int(payload.get("attempt") or 1), "context": str(payload.get("context") or "")}
    try:
        result = await BRAIN(body)
    except Exception:  # noqa: BLE001 — 어떤 실패든 계약 모양으로
        result = fallback(body["request_id"])
    STORE.add_request({"request_id": body["request_id"], "user": user, "question": question,
                       "route": result.get("route"), "ticket": result.get("ticket")})
    return result


@app.get("/api/my-requests")
def my_requests(user: str, x_entry_code: str | None = Header(default=None)):
    need_entry(x_entry_code)
    items = []
    for row in STORE.my_requests(user):
        ticket = row.get("ticket")
        if ticket:
            found = STORE.get_ticket(ticket.get("ticket_id", ""))
            ticket = {**ticket, "status": found["status"] if found else "접수됨"}
        items.append({k: row.get(k) for k in ("request_id", "question", "route", "created_at")} | {"ticket": ticket})
    return {"items": items}


@app.get("/api/admin/tickets")
def admin_tickets(status: str | None = None, x_entry_code: str | None = Header(default=None), x_user: str | None = Header(default=None)):
    need_entry(x_entry_code)
    need_role(x_user, ADMIN_ROLES)
    return {"items": STORE.list_tickets(status)}


@app.patch("/api/admin/tickets/{ticket_id}")
def admin_update(ticket_id: str, payload: dict, x_entry_code: str | None = Header(default=None), x_user: str | None = Header(default=None)):
    need_entry(x_entry_code)
    need_role(x_user, ADMIN_ROLES)
    ticket = STORE.update_ticket(ticket_id, payload)
    if not ticket:
        raise HTTPException(404, "없는 티켓이에요")
    return {k: ticket[k] for k in ("ticket_id", "status", "note")}


@app.get("/api/admin/alerts")
def admin_alerts(x_entry_code: str | None = Header(default=None), x_user: str | None = Header(default=None)):
    need_entry(x_entry_code)
    need_role(x_user, ADMIN_ROLES)
    return {"items": STORE.list_alerts()}


@app.get("/api/admin/requests")
def admin_requests(route: str | None = None, x_entry_code: str | None = Header(default=None), x_user: str | None = Header(default=None)):
    """막힌 요청 모아 보기 — route를 쉼표로 (예: 권한 없음,차단). 질문 글자 속 연락처는 가림, 최근 100건."""
    need_entry(x_entry_code)
    need_role(x_user, ADMIN_ROLES)
    routes = [item.strip() for item in route.split(",") if item.strip()] if route else None
    rows = STORE.list_requests(routes)[:100]
    return {"items": [{"request_id": r["request_id"], "user": r["user"], "question": mask_text(r.get("question", "")),
                       "route": r.get("route"), "created_at": r.get("created_at"),
                       "ticket_id": (r.get("ticket") or {}).get("ticket_id")} for r in rows]}


KST = timezone(timedelta(hours=9))


@app.get("/api/admin/summary")
def admin_summary(x_entry_code: str | None = Header(default=None), x_user: str | None = Header(default=None)):
    """약국장 '오늘 한눈 요약' — 오늘(한국 시각) 화면으로 들어온 질문 수 · 처리 방식별 수, 지금 열린 티켓 수."""
    need_entry(x_entry_code)
    need_role(x_user, ADMIN_ROLES)
    start = datetime.now(KST).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = STORE.list_requests(None, start)
    tickets = STORE.list_tickets(None)
    open_tickets = [t for t in tickets if t.get("status") != "처리 완료"]
    week = Counter(" ".join(str(r.get("question", "")).split()) for r in STORE.list_requests(None, start - timedelta(days=6)))
    top = [{"question": mask_text(q), "count": n} for q, n in week.most_common(5) if q and n >= 2]
    return {"date": start.date().isoformat(), "questions": len(rows), "top_questions_week": top,
            "by_route": dict(Counter(r.get("route") or "기타" for r in rows)),
            "tickets_open": len(open_tickets), "tickets_urgent_open": sum(t.get("priority") == "high" for t in open_tickets),
            "tickets_by_status": dict(Counter(t.get("status") for t in tickets))}


@app.get("/api/admin/handover")
def handover_latest(x_entry_code: str | None = Header(default=None), x_user: str | None = Header(default=None)):
    """아직 확인 안 한 마지막 퇴근 인수인계 (없으면 item: null)."""
    need_entry(x_entry_code)
    need_role(x_user, ADMIN_ROLES)
    return {"item": STORE.latest_handover()}


@app.post("/api/admin/handover")
def handover_add(payload: dict, x_entry_code: str | None = Header(default=None), x_user: str | None = Header(default=None)):
    """남길 말 + 지금 열린 티켓(번호 · 제목 · 상태)을 서버가 붙여 저장. 손님 정보 · 연락처는 넣지 않음."""
    need_entry(x_entry_code)
    person = need_role(x_user, ADMIN_ROLES)
    note = mask_text(str(payload.get("note") or "").strip())[:500]
    open_tickets = [{"ticket_id": t["ticket_id"], "title": mask_text(t.get("title", "")), "status": t.get("status")}
                    for t in STORE.list_tickets(None) if t.get("status") != "처리 완료"]
    if not note and not open_tickets:
        raise HTTPException(400, "남길 말이나 열린 접수 건이 있어야 해요")
    return {"item": STORE.add_handover(person["name"], note, open_tickets)}


@app.post("/api/admin/handover/{handover_id}/done")
def handover_done(handover_id: int, x_entry_code: str | None = Header(default=None), x_user: str | None = Header(default=None)):
    need_entry(x_entry_code)
    person = need_role(x_user, ADMIN_ROLES)
    row = STORE.done_handover(handover_id, person["name"])
    if not row:
        raise HTTPException(404, "없는 인수인계예요")
    return {"item": row}


@app.get("/api/today")
def today(x_entry_code: str | None = Header(default=None), x_user: str | None = Header(default=None)):
    """직원 출근 화면용 오늘 알림 요약 — 매장 전체 회수 공지(열린 것) 제목과 긴급 열린 건 수만. 남의 접수 건 내용은 주지 않음."""
    need_entry(x_entry_code)
    need_role(x_user, {"staff", "pharmacist", "owner"})
    open_tickets = [t for t in STORE.list_tickets(None) if t.get("status") != "처리 완료"]
    return {"recall_open": [{"ticket_id": t["ticket_id"], "title": mask_text(t.get("title", ""))} for t in open_tickets if t.get("category") == "recall"],
            "urgent_open": sum(t.get("priority") == "high" for t in open_tickets)}


@app.get("/api/rules")
def rules(x_entry_code: str | None = Header(default=None)):
    """이관 규칙표 — 화면이 글을 옮겨 적지 않고 지식 문서(scope-and-escalation)를 그대로 받음."""
    need_entry(x_entry_code)
    path = REPO / "knowledge" / "scope-and-escalation.md"
    if not path.exists():
        raise HTTPException(404, "규칙 문서가 없어요")
    return {"doc": "scope-and-escalation", "markdown": path.read_text(encoding="utf-8")}


@app.post("/api/admin/tickets/{ticket_id}/recall-notice")
def recall_notice(ticket_id: str, x_entry_code: str | None = Header(default=None), x_user: str | None = Header(default=None)):
    """약사 승인 → 그 제품을 산 손님 중 회수 · 안전 알림에 따로 동의한 사람만, 연습 기록 (실제 발송 없음)."""
    need_entry(x_entry_code)
    need_role(x_user, {"pharmacist"})
    ticket = STORE.get_ticket(ticket_id)
    if not ticket or ticket.get("category") != "recall" or not ticket.get("product"):
        raise HTTPException(404, "회수 티켓이 아니에요")
    rows = STORE.notices_for(ticket_id)
    if not rows:
        buyers = [c for c in load("data/customers.json", []) if c.get("recall_consent")
                  and any(p["product"] == ticket["product"] for p in c.get("purchases", []))]
        rows = [{"ticket_id": ticket_id, "customer_id": c["customer_id"], "phone": mask_phone(c["phone"]),
                 "message": NOTICE_TEXT, "status": "practice_logged"} for c in buyers]
        STORE.add_notices(rows)  # 기록엔 customer_id · 가린 번호 · 약 이름 없는 안내문만
    return {"ticket_id": ticket_id, "count": len(rows), "mode": "practice", "message": NOTICE_TEXT,
            "notices": [{k: r[k] for k in ("customer_id", "phone", "status")} for r in rows]}


@app.post("/tickets")
def create_ticket(payload: dict, x_api_key: str | None = Header(default=None)):
    need_api_key(x_api_key)
    if not str(payload.get("key") or "").strip() or not str(payload.get("title") or "").strip():
        raise HTTPException(400, "key and title are required")
    ticket, duplicate = STORE.upsert_ticket(payload)
    return JSONResponse(status_code=200 if duplicate else 201, content={"ticket_id": ticket["ticket_id"], "duplicate": duplicate})


@app.post("/alerts")
def create_alert(payload: dict, x_api_key: str | None = Header(default=None)):
    need_api_key(x_api_key)
    return {"stored": 1, "count": STORE.add_alert(payload)}


@app.get("/stock/{name}")
def stock(name: str):
    rows = load("data/stock.json", None)
    if rows is None:
        raise HTTPException(404, "stockout pack off")
    row = next((r for r in rows if r["product"].lower() == name.lower()), None)
    if not row:
        raise HTTPException(404, "재고 정보가 없어요")
    return row
