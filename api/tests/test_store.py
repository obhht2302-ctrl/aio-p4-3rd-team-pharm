"""저장소 계약 시험 — n8n이 넘긴 ticket_id를 저장소가 그대로 쓰는지 확인한다."""
import os

import pytest

from app.store import MemoryStore, PgStore

STORE_KINDS = ["memory", "postgres"] if os.getenv("DATABASE_URL") else ["memory"]


@pytest.mark.parametrize("kind", STORE_KINDS)
def test_upsert_ticket_keeps_provided_ticket_id(kind):
    if kind == "postgres":
        store = PgStore(os.environ["DATABASE_URL"])
        store.reset_for_tests()
    else:
        store = MemoryStore()
    body = {
        "key": "test-keep-ticket-id",
        "ticket_id": "T-2001",
        "title": "번호 유지 시험",
        "requester": "김하늘",
        "category": "other",
        "priority": "normal",
    }
    ticket, duplicate = store.upsert_ticket(body)
    assert duplicate is False
    assert ticket["ticket_id"] == "T-2001"

    again, duplicate_again = store.upsert_ticket(body)
    assert duplicate_again is True
    assert again["ticket_id"] == "T-2001"


@pytest.mark.parametrize("kind", STORE_KINDS)
def test_reused_ticket_id_replaces_stale_ticket(kind):
    """data-api가 다시 켜져 같은 번호를 다른 요청에 주면, 지난 회차 티켓 · 안내 기록을 비우고 새 티켓을 저장한다."""
    if kind == "postgres":
        store = PgStore(os.environ["DATABASE_URL"])
        store.reset_for_tests()
    else:
        store = MemoryStore()
    old = {"key": "round1-request", "ticket_id": "T-2001", "title": "지난 회차", "requester": "김하늘",
           "category": "recall", "priority": "high", "product": "OTC-03"}
    store.upsert_ticket(old)
    store.update_ticket("T-2001", {"status": "처리 완료"})
    store.add_notices([{"ticket_id": "T-2001", "customer_id": "C-001", "phone": "010-****-0001",
                        "message": "안내", "status": "practice_logged"}])

    new = {"key": "round2-request", "ticket_id": "T-2001", "title": "새 회차", "requester": "최영순",
           "category": "senior", "priority": "normal"}
    ticket, duplicate = store.upsert_ticket(new)
    assert duplicate is False
    assert ticket["ticket_id"] == "T-2001" and ticket["title"] == "새 회차" and ticket["status"] == "접수됨"
    assert [t["title"] for t in store.list_tickets()] == ["새 회차"]
    assert store.get_ticket("T-2001")["title"] == "새 회차"
    assert store.notices_for("T-2001") == []
