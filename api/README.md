# api · FastAPI 뒷단 (조합 C)

경로와 모양은 띄운 뒤 `http://localhost:8000/docs`(FastAPI 자동 문서), 예시 요청 · 응답은 [`../contracts/examples/api.json`](../contracts/examples/api.json) (시험도 이 파일을 씀).

```bash
cd api
uv run --python 3.12 --with fastapi --with httpx --with pytest python -m pytest -q             # 시험 — 메모리 저장소로 16 passed가 정상 (DATABASE_URL이 있으면 PostgreSQL에서도 같은 시험을 더 돈다)
TEAM3_ENTRY_CODE=dev uv run --python 3.12 --with fastapi --with uvicorn --with httpx \
  uvicorn app.main:app --port 8000                                                              # 띄우기 → http://localhost:8000/docs
```

- `--python 3.12`: 시스템 파이썬이 너무 새 버전이면 pydantic의 미리 빌드된 설치 파일(wheel)이 없어 설치가 깨져서 버전을 정해 둡니다.
- 저장소: `DATABASE_URL`이 비면 메모리 (`app/store.py` `MemoryStore`), 있으면 PostgreSQL (`PgStore`, 표 `app/schema.sql`). PostgreSQL은 `docker compose -f infra/compose.team3.yml --profile db up -d db` 뒤 `DATABASE_URL=postgresql://team3:<DB_PASSWORD>@db:5432/team3`로 켭니다.
- `DATABASE_URL`을 켜고 pytest를 돌리면 같은 시험이 **메모리 · PostgreSQL 양쪽**에서 돕니다 (`api/tests/`). n8n이 넘긴 `ticket_id`를 그대로 쓰는지도 `test_store.py`가 확인합니다.
- 환경 변수 (`infra/.env.example`): `TEAM3_ENTRY_CODE` (화면 입장 코드, 비면 검사 안 함) · `TEAM3_API_KEY` (n8n이 `POST /tickets` · `/alerts`에 보내는 키) · `N8N_WEBHOOK_URL` · `N8N_WEBHOOK_KEY` (`/api/ask`가 부르는 팀 웹훅) — 두 키는 compose가 `infra/.env`의 `TEAM3_KEY` 하나로 채움 · `DATA_API_URL` (화면 알림을 읽을 data-api 주소, compose는 `http://data-api:8800`, 비면 로컬 저장소만 봄) · `ALERTS_CACHE_SECONDS` (기본 3) · `CORS_ORIGINS`.
- n8n 안에서 이 API를 부를 때는 `http://api:8000` (compose 서비스 이름).

## 인수인계 (서버 저장)

인수인계는 앱(태블릿 `localStorage`)이 아니라 서버(`handovers` 표)에 남습니다. 그래서 교대한 약사가 **다른 태블릿 · 브라우저**로 들어와도 같은 인수인계가 보입니다. `GET`은 아직 확인 안 한 마지막 한 건을 주고, 없으면 `{"item": null}`입니다.

```bash
X_ENTRY='dev'   # 띄울 때 TEAM3_ENTRY_CODE에 넣은 값 (위 예시면 dev)
X_USER='%EC%9D%B4%EC%84%9C%EC%A4%80'   # 이서준 (X-User는 encodeURIComponent 값)
BASE='http://localhost:8000'

curl -s -H "X-Entry-Code: $X_ENTRY" -H "X-User: $X_USER" "$BASE/api/admin/handover"
curl -s -X POST -H "X-Entry-Code: $X_ENTRY" -H "X-User: $X_USER" -H 'Content-Type: application/json' \
  -d '{"note":"회수 건 손님 연락이 한 분 남았어요"}' "$BASE/api/admin/handover"
curl -s -X POST -H "X-Entry-Code: $X_ENTRY" -H "X-User: %EC%A0%95%EB%AF%BC%EC%9E%AC" "$BASE/api/admin/handover/1/done"  # 정민재
```

응답 모양은 세 경로 모두 같습니다.

```json
{"item": {"id": 1, "by": "이서준", "note": "회수 건 손님 연락이 한 분 남았어요",
          "open": [{"ticket_id": "T-2003", "title": "OTC-03 회수 제품 진열 중", "status": "접수됨"}],
          "at": "2026-11-05T18:05:41+09:00", "done_at": null, "done_by": null}}
```

- `POST /api/admin/handover`는 `{note}`만 보냅니다. 열린 티켓(번호 · 제목 · 상태)은 서버가 붙이고, `note`도 열린 건도 없으면 400입니다.
- `POST /api/admin/handover/{id}/done`은 `done_at` · `done_by`를 채웁니다. 끝난 건은 `GET`에 나오지 않습니다.
- 메모리 저장소는 api를 다시 켜면 비어요. 다른 기기에서 보이는 것을 확인하려면 `DATABASE_URL`(PostgreSQL)로 띄우세요.
