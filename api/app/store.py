"""저장소 — 지금은 메모리, DATABASE_URL이 있으면 PostgreSQL (PgStore는 병훈님이 구현, 표 초안은 schema.sql)."""
from __future__ import annotations

import itertools
import time
from pathlib import Path


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


class PgStore:
    """PostgreSQL 저장소. `DATABASE_URL`이 있을 때만 쓰고, 없으면 MemoryStore.

    표는 `schema.sql`이 기준이다. 메모리 저장소와 같은 메서드 이름 · 반환 모양을 유지한다.
    """

    name = "postgres"

    def __init__(self, dsn: str) -> None:
        import psycopg
        from psycopg.rows import dict_row

        self._db = psycopg.connect(dsn, autocommit=True, row_factory=dict_row)
        schema = (Path(__file__).with_name("schema.sql")).read_text(encoding="utf-8")
        with self._db.cursor() as cur:
            cur.execute(schema)

    # requests
    def add_request(self, item: dict) -> dict:
        with self._db.cursor() as cur:
            cur.execute(
                """INSERT INTO requests (request_id, "user", question, route, ticket_id)
                   VALUES (%s, %s, %s, %s, %s)
                   ON CONFLICT (request_id) DO UPDATE
                     SET route = EXCLUDED.route, ticket_id = EXCLUDED.ticket_id
                   RETURNING request_id, "user", question, route, ticket_id, created_at""",
                (item["request_id"], item["user"], item["question"], item.get("route"),
                 (item.get("ticket") or {}).get("ticket_id")),
            )
            return self._request_row(cur.fetchone())

    def my_requests(self, user: str) -> list[dict]:
        with self._db.cursor() as cur:
            cur.execute(
                """SELECT request_id, "user", question, route, ticket_id, created_at
                   FROM requests WHERE "user" = %s ORDER BY created_at DESC""",
                (user,),
            )
            return [self._request_row(row) for row in cur.fetchall()]

    @staticmethod
    def _request_row(row: dict) -> dict:
        row = dict(row)
        row["created_at"] = row["created_at"].isoformat()
        if row.get("ticket_id"):
            row["ticket"] = {"ticket_id": row.pop("ticket_id")}
        else:
            row.pop("ticket_id", None)
            row["ticket"] = None
        return row

    # tickets (key 멱등)
    def upsert_ticket(self, body: dict) -> tuple[dict, bool]:
        key = body["key"]
        ticket_id = body.get("ticket_id") or None  # n8n이 넘긴 번호가 있으면 그대로 쓴다 (메모리 저장소와 같게)
        with self._db.cursor() as cur:
            cur.execute(
                """INSERT INTO tickets (ticket_id, key, title, requester, category, priority, product)
                   VALUES (COALESCE(%s, 'T-' || nextval('team3_ticket_seq')), %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (key) DO NOTHING
                   RETURNING *""",
                (ticket_id, key, body.get("title", ""), body.get("requester", ""), body.get("category", ""),
                 body.get("priority", "normal"), body.get("product", "")),
            )
            inserted = cur.fetchone()
            if inserted:
                return self._ticket_row(inserted), False
            cur.execute("SELECT * FROM tickets WHERE key = %s", (key,))
            return self._ticket_row(cur.fetchone()), True

    @staticmethod
    def _ticket_row(row: dict) -> dict:
        row = dict(row)
        row["created_at"] = row["created_at"].isoformat()
        return row

    def list_tickets(self, status: str | None = None) -> list[dict]:
        with self._db.cursor() as cur:
            if status:
                cur.execute("SELECT * FROM tickets WHERE status = %s ORDER BY (priority <> 'high'), created_at", (status,))
            else:
                cur.execute("SELECT * FROM tickets ORDER BY (priority <> 'high'), created_at")
            return [self._ticket_row(row) for row in cur.fetchall()]

    def get_ticket(self, ticket_id: str) -> dict | None:
        with self._db.cursor() as cur:
            cur.execute("SELECT * FROM tickets WHERE ticket_id = %s", (ticket_id,))
            row = cur.fetchone()
            return self._ticket_row(row) if row else None

    def update_ticket(self, ticket_id: str, fields: dict) -> dict | None:
        allowed = {k: v for k, v in fields.items() if k in ("status", "note") and v is not None}
        if not allowed:
            return self.get_ticket(ticket_id)
        sets = ", ".join(f"{k} = %s" for k in allowed)
        with self._db.cursor() as cur:
            cur.execute(f"UPDATE tickets SET {sets} WHERE ticket_id = %s RETURNING *",
                        (*allowed.values(), ticket_id))
            row = cur.fetchone()
            return self._ticket_row(row) if row else None

    # alerts · notices
    def add_alert(self, body: dict) -> int:
        with self._db.cursor() as cur:
            cur.execute(
                """INSERT INTO alerts (workflow, node, severity, reason, message, ticket_id)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (body.get("workflow"), body.get("node"), body.get("severity"), body.get("reason"),
                 body.get("message"), body.get("ticket_id")),
            )
            cur.execute("SELECT count(*) AS count FROM alerts")
            return int(cur.fetchone()["count"])

    def list_alerts(self) -> list[dict]:
        with self._db.cursor() as cur:
            cur.execute("SELECT * FROM alerts ORDER BY id DESC")
            rows = []
            for row in cur.fetchall():
                row = dict(row)
                row["at"] = row["at"].isoformat()
                rows.append(row)
            return rows

    def notices_for(self, ticket_id: str) -> list[dict]:
        with self._db.cursor() as cur:
            cur.execute(
                """SELECT ticket_id, customer_id, phone_masked AS phone, message, status, at
                   FROM notices WHERE ticket_id = %s ORDER BY id""",
                (ticket_id,),
            )
            rows = []
            for row in cur.fetchall():
                row = dict(row)
                row["at"] = row["at"].isoformat()
                rows.append(row)
            return rows

    def add_notices(self, rows: list[dict]) -> None:
        with self._db.cursor() as cur:
            for row in rows:
                cur.execute(
                    """INSERT INTO notices (ticket_id, customer_id, phone_masked, message, status)
                       VALUES (%s, %s, %s, %s, %s)
                       ON CONFLICT (ticket_id, customer_id) DO NOTHING""",
                    (row["ticket_id"], row["customer_id"], row.get("phone", ""), row.get("message", ""),
                     row.get("status", "practice_logged")),
                )

    def reset_for_tests(self) -> None:
        """시험 사이에만 쓰는 초기화. 운영 코드에서는 호출하지 않는다."""
        with self._db.cursor() as cur:
            cur.execute("TRUNCATE requests, notices, alerts, tickets RESTART IDENTITY CASCADE")
            cur.execute("ALTER SEQUENCE team3_ticket_seq RESTART WITH 3001")


def make_store(dsn: str):
    return PgStore(dsn) if dsn else MemoryStore()
