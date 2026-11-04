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
