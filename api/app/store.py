"""저장소 — 지금은 메모리, DATABASE_URL이 있으면 PostgreSQL (PgStore는 병훈님이 구현, 표 초안은 schema.sql)."""
from __future__ import annotations

import itertools
import time


def now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")


class MemoryStore:
    """서버를 다시 켜면 비어요. 시연 · 시험용."""

    name = "memory"

    def __init__(self) -> None:
        self.requests: list[dict] = []
        self.tickets: dict[str, dict] = {}  # key → ticket
        self.alerts: list[dict] = []
        self.notices: list[dict] = []
        self._ids = itertools.count(3001)

    # requests (화면에서 들어온 질문 — 질문 글자는 화면용으로만 남기고 로그에는 쓰지 않음)
    def add_request(self, item: dict) -> dict:
        row = {**item, "created_at": now()}
        self.requests.append(row)
        return row

    def my_requests(self, user: str) -> list[dict]:
        return [r for r in reversed(self.requests) if r["user"] == user]

    # tickets (data-api와 같은 모양, key 멱등)
    def upsert_ticket(self, body: dict) -> tuple[dict, bool]:
        key = body["key"]
        if key in self.tickets:
            return self.tickets[key], True
        ticket = {"ticket_id": body.get("ticket_id") or f"T-{next(self._ids)}", "key": key, "status": "접수됨", "note": "",
                  "created_at": now(), **{k: body.get(k, "") for k in ("title", "requester", "category", "priority", "product")}}
        self.tickets[key] = ticket
        return ticket, False

    def list_tickets(self, status: str | None = None) -> list[dict]:
        items = [t for t in self.tickets.values() if not status or t["status"] == status]
        return sorted(items, key=lambda t: (t["priority"] != "high", t["created_at"]))

    def get_ticket(self, ticket_id: str) -> dict | None:
        return next((t for t in self.tickets.values() if t["ticket_id"] == ticket_id), None)

    def update_ticket(self, ticket_id: str, fields: dict) -> dict | None:
        ticket = self.get_ticket(ticket_id)
        if ticket:
            ticket.update({k: v for k, v in fields.items() if k in ("status", "note") and v is not None})
        return ticket

    # alerts · notices
    def add_alert(self, body: dict) -> int:
        self.alerts.append({**body, "at": now()})
        return len(self.alerts)

    def list_alerts(self) -> list[dict]:
        return list(reversed(self.alerts))

    def notices_for(self, ticket_id: str) -> list[dict]:
        return [n for n in self.notices if n["ticket_id"] == ticket_id]

    def add_notices(self, rows: list[dict]) -> None:
        self.notices.extend({**r, "at": now()} for r in rows)


class PgStore(MemoryStore):
    """[병훈님이 정함] PostgreSQL 저장소. schema.sql 초안을 보고 같은 메서드를 구현합니다."""

    name = "postgres"

    def __init__(self, dsn: str) -> None:
        raise NotImplementedError("PgStore는 아직 없어요. DATABASE_URL을 비우면 메모리 저장소로 돌아요 (specs/03-backend.md 3절).")


def make_store(dsn: str):
    return PgStore(dsn) if dsn else MemoryStore()
