# api · FastAPI 뒷단 (조합 C)

경로와 모양은 [`../specs/03-backend.md`](../specs/03-backend.md) 3절, 예시 요청 · 응답은 [`../contracts/examples/api.json`](../contracts/examples/api.json) (시험도 이 파일을 씀).

```bash
cd api
uv run --python 3.12 --with fastapi --with httpx --with pytest python -m pytest -q             # 시험 (기본 14개, DATABASE_URL이면 28개)
TEAM3_ENTRY_CODE=dev uv run --python 3.12 --with fastapi --with uvicorn --with httpx \
  uvicorn app.main:app --port 8000                                                              # 띄우기 → http://localhost:8000/docs
```

- `--python 3.12`: 시스템 파이썬이 너무 새 버전이면 pydantic 바퀴가 없어 설치가 깨져서 버전을 정해 둡니다.
- 저장소: `DATABASE_URL`이 비면 메모리 (`app/store.py` `MemoryStore`), 있으면 PostgreSQL (`PgStore`, 표 `app/schema.sql`). PostgreSQL은 `docker compose -f infra/compose.team3.yml --profile db up -d db` 뒤 `DATABASE_URL=postgresql://team3:<DB_PASSWORD>@db:5432/team3`로 켭니다.
- `DATABASE_URL`을 켜고 pytest를 돌리면 같은 시험이 **메모리 · PostgreSQL 양쪽**에서 돕니다 (`api/tests/`). n8n이 넘긴 `ticket_id`를 그대로 쓰는지도 `test_store.py`가 확인합니다.
- 환경 변수 (`infra/.env.example`): `TEAM3_ENTRY_CODE` (화면 입장 코드, 비면 검사 안 함) · `TEAM3_API_KEY` (n8n이 `POST /tickets` · `/alerts`에 보내는 키) · `N8N_WEBHOOK_URL` · `N8N_WEBHOOK_KEY` (`/api/ask`가 부르는 팀 웹훅) — 두 키는 compose가 `infra/.env`의 `TEAM3_KEY` 하나로 채움 · `DATA_API_URL` (화면 알림을 읽을 data-api 주소, compose는 `http://data-api:8800`, 비면 로컬 저장소만 봄) · `ALERTS_CACHE_SECONDS` (기본 3) · `CORS_ORIGINS`.
- n8n 안에서 이 API를 부를 때는 `http://api:8000` (compose 서비스 이름).
