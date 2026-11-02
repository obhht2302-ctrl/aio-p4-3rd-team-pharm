# 03 · 연동 · 안정성 + 뒷단 명세 (설계판) — `team3-handoff` · `team3-errors` · `api/`

- 맡은 사람: 병훈 · 마감: 11/5(목) · 별 ★★★
- 과제 한 문장: **본체가 "넘겨"라고 하면 data-api에 먼저 기록(티켓 · 알림 · DLQ)하고 화면 · Slack · Jira에 덧붙이며, 밖이 멈춰도 요청을 잃지 않고 200으로 답하는 이관 모듈 + 예상 못 한 오류의 마지막 그물 + 약사 화면이 읽는 FastAPI 뒷단.**
- 이 명세는 **뼈대 + 설계 + 병훈님이 정할 칸**입니다. 계약 · 필수 기준은 고정, 내부 구조 · DB 표 세부 · 에러 정책 수치는 "병훈님이 정함" 칸에 직접 정하고 `docs/WORKFLOW-DESIGN.md` 5~7절에 적습니다.
- 산출물: 워크플로우 설계서(`docs/WORKFLOW-DESIGN.md`) 5절 (외부 연동 표) · 6절 (연결선 페이로드) · 7절 (오류 처리 표).

| 병훈님이 정하는 것 | 바꾸면 안 되는 것 |
| --- | --- |
| 노드 구성 · 이름 (설계서와 같게), 재시도 횟수 · timeout (본체 8초 안), 알림 억제 규칙, DLQ 항목 모양, FastAPI 내부 구조 · 파일 나누기, DB 표 칸 · 색인, 저장소 교체 방식 | handoff 주고받는 칸 (`00-DESIGN.md` 3.3절), **기록 순서 (`00-DESIGN.md` 3.4절 '기록은 data-api에 먼저')**, `key = request_id` 멱등, 실패해도 200, 401 · 403 재시도 금지, `team3Errors00001`, API 경로와 응답 모양 (아래 3절), 실제/연습 스위치 한 곳 (기본 연습), 문자 실제 발송 금지 |

## 0. 시작 전

### 시작 전 준비 (README · 모든 명세에 같은 내용)

```bash
# 1) 레포 받기 — 처음이면 clone, 이미 있으면 pull. 레포 경로는 어느 문서에서나 ~/aio-p4-3rd-team-pharm
git clone https://github.com/twlaude/aio-p4-3rd-team-pharm.git ~/aio-p4-3rd-team-pharm
cd ~/aio-p4-3rd-team-pharm && git pull

# 2) 샘 키트 받기 — 지금 기준 ~/aio-01d4-stu/Last3Mon/77 (80일차 키트가 나오면 77 → 80)
cd ~/aio-01d4-stu && git pull

# 3) n8n 켜기 (수업 때와 같음) → 브라우저 http://localhost:5678
cd ~/aio-01d4-stu/Last3Mon/65/n8n && docker compose start

# 4) data-api 켜기 — 샘 77판 server.py에 우리 문서 · 데이터를 붙인 것 (샘 77 data-api는 먼저 끔)
cd ~/aio-01d4-stu/Last3Mon/77/data-api && docker compose down
cd ~/aio-p4-3rd-team-pharm && cp -n infra/.env.example infra/.env    # 처음 한 번: infra/.env의 SAM_DATA_API를 내 홈 경로로 고침
docker compose -f infra/compose.team3.yml --env-file infra/.env up -d data-api

# 5) 팀 웹훅 키 — 리드(태웅)에게 디코 DM으로 받아 터미널에서만 (파일 · 레포에 쓰지 않음, 새 터미널마다 다시)
export FLOW_WEBHOOK_KEY=받은값

# 6) flow.py는 샘 키트 폴더에서 실행하고, 파일은 레포 경로로 넘김
cd ~/aio-01d4-stu/Last3Mon/77 && uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-support.json
```

| n8n Credential 이름 (값은 n8n에만, 레포 · 문서에 쓰지 않음) | 쓰는 곳 |
| --- | --- |
| `OpenAI (.env)` | 수업 때 이미 있음. 채팅 `gpt-4.1-mini` · 임베딩 `text-embedding-3-large` |
| `team3WebhookKey` | 팀 웹훅 Header Auth (머리글 `X-Team-Key`, 값 = 5)의 팀 웹훅 키) |
| `dataApiKey` | data-api로 나가는 호출의 `X-Api-Key` (80일차 키트에서 요구 — 키트 확인) |

- 77판 `flow.py`는 `FLOW_WEBHOOK_KEY`를 보내지 않아요 (80일차 키트판부터 보냄 — 키트 확인). 그래서 키트가 나오기 전 노트북 시험은 웹훅 노드 Authentication을 `None`으로 두고 하고, 키트판이 나오면 Header Auth(`team3WebhookKey`)로 바꿉니다. 가짜 웹훅(`workflows/stubs/`)은 처음부터 인증이 없습니다.

처음 보는 말은 [README 용어 표](../README.md#용어)에 있어요. 공통 시나리오 번호 뜻 (`cases/common.json`, 자세히는 `00-DESIGN.md` 7절): WF-01 문서로 답 · WF-02/02b 정보 부족 → 보완 질문, 3번째면 이관 · WF-03 문서에 없는 일 → 이관 · WF-04 티켓 API 장애 → DLQ · 알림 · WF-05 권한 밖 문서 (약국장 전용) · WF-06 남의 접수 건 · WF-07 연락처 가림 · WF-08 주입 공격 차단 · WF-09 같은 요청 두 번 → 티켓 1건 · WF-10 LLM 멈춤 · WF-11 접수 조회 지연 · WF-12 회수 긴급 + 접수 조회 · WF-13 잘못된 입력 → 400.

### 혼자 끝까지 확인하는 법

```bash
cd ~/aio-01d4-stu/Last3Mon/77
uv run tools/flow.py push ~/aio-p4-3rd-team-pharm/workflows/team3-handoff.json ~/aio-p4-3rd-team-pharm/workflows/team3-errors.json
uv run tools/flow.py call team3-handoff ~/aio-p4-3rd-team-pharm/requests/handoff-sample.json   # 보통 이관 → 티켓 1, 같은 요청 다시 → duplicate: true
uv run tools/flow.py call team3-handoff ~/aio-p4-3rd-team-pharm/requests/handoff-recall.json   # 긴급 → 티켓 + 알림 1
uv run tools/flow.py fault tickets error && uv run tools/flow.py call team3-handoff ~/aio-p4-3rd-team-pharm/requests/handoff-recall.json; uv run tools/flow.py fault all ok   # 실패 경로: 200 · ticket null · DLQ 1 · 알림 1
cd ~/aio-p4-3rd-team-pharm/api && uv run --python 3.12 --with fastapi --with httpx --with pytest python -m pytest -q
```

### 가짜 먼저, 준비되면 바꿔 끼우기

계약이 먼저 고정돼 있어서 오늘부터 바로 시작합니다. 남의 부품이 없으면 `contracts/examples/`의 예시를 그대로 쓰는 가짜로 대신하고, 진짜가 준비되면 스위치 한 곳만 바꿉니다. 완료 목표는 11/5(목) 하나입니다.

| 바로 할 수 있는 것 | 남의 것이 필요한 것 | 그동안 쓰는 가짜 (`contracts/examples/`) | 바꿔 끼우는 법 |
| --- | --- | --- | --- |
| `team3-handoff` · `team3-errors` (data-api만 있으면 됨), `api/` (pytest) | 없음 (본체 · 화면 없이 단독으로 됨) | 본체가 보낼 요청 = `handoff.json`의 `request`, 화면 · n8n이 보낼 요청 = `api.json` | 다영이 `HANDOFF=real`, 태웅이 `NEXT_PUBLIC_API_MODE=real` |
| ⏳ **진짜를 기다려야 하는 것** | 공통 WF-04 · 09 · 10 · 11 (본체와 붙인 뒤). | — (가짜로는 못 함) | 연결 뒤 진짜로 잼 |

**가짜로 시작할 때 쓰는 파일** (모양은 전부 `contracts/examples/`가 기준):

| 파일 | 무엇을 대신하나 |
| --- | --- |
| `contracts/examples/handoff.json` | 본체(다영). `request` = 본체가 보낼 요청, `response_ok` · `response_duplicate` · `response_tickets_down` = 내가 돌려줘야 할 응답 3가지 |
| `requests/handoff-sample.json` · `handoff-recall.json` · `recall-announce.json` | 본체 대신 `flow.py call team3-handoff`로 보내는 요청 (보통 이관 · 긴급 회수 · 회수 공표) |
| `contracts/examples/api.json` | 화면(태웅) · n8n이 FastAPI에 보내는 요청과 받을 응답 (경로마다). `api/tests/`의 pytest가 이 파일을 씀 |
| `workflows/stubs/team3-handoff-stub.json` | 내 handoff가 나오기 전 다영이 쓰는 가짜 (내가 고칠 것 없음, 진짜도 같은 응답 모양이면 됨) |

- `git pull`. 읽을 것: `00-DESIGN.md` 3 · 4 · 9절, 샘 `06-RELIABILITY-AND-SECURITY.md`, `02-ENVIRONMENT-AND-SERVICES.md` 2절 (조합 C 어댑터), `Last3Mon/76/AGENTS.md` 2~5절.
- 가져다 쓸 실습: `76/reference/lab02-example2-intake.json` (재시도 · 멱등 키 · DLQ · 알림), `76/reference/lab02-example2-error-handler.json` (Error Trigger), `76/reference/lab02-example1-dlq.json`, `72/reference/lab03-example3-ticket-down.json`.
- 이미 있는 것: `workflows/team3-ticket.json` (Jira) · `team3-alert.json` (Slack)은 리드 담당. `api/`에 뼈대 (메모리 저장소로 돌고 pytest 통과) — 여기서 시작합니다.

## 1. `team3-handoff` (n8n)

**고정 계약** — 요청 `{request_id, user, type, title, assignee, priority, reason, summary?, product?, mode?}` → 응답 늘 HTTP 200:

```json
{"ticket": {"ticket_id": "T-2001", "priority": "high", "duplicate": false}, "reason": "", "dlq": false, "alert": true,
 "extras": {"screen": "ok", "slack": "skipped", "jira": "skipped"}, "handoff_ms": 412}
```

**고정 순서** (공통 시나리오가 data-api 기록으로 판정하기 때문):

1. data-api `POST /tickets` `{key: request_id, title, requester: user, category: type, priority}` → 실패 (5xx · timeout)면 `POST /dlq` (`item.id = request_id`, 개인정보 없이) + `POST /alerts` (`reason: tickets_down`, `severity: high`), `ticket: null`.
2. 성공이고 `priority: high`면 `POST /alerts` (`reason: urgent`). 보통 이관은 알림 없음.
3. 덧붙임 (실패 무시, `extras`에 결과만): FastAPI `POST http://api:8000/tickets` (약사 화면, data-api가 준 `ticket_id` · `product`를 같이 넘김, 머리글 `X-Api-Key`), `mode = real`일 때만 Execute Workflow `team3Alert000001` (Slack — 위 1번(티켓 실패)이나 2번(긴급)에서 data-api 알림을 남긴 경우)과 `team3Ticket00001` (Jira — 티켓 API 실패 `tickets_down`일 때만)을 부릅니다.
4. 401 · 403은 재시도하지 않고 바로 DLQ + 알림 (`reason: auth_failed`).

- `mode`(실제/연습 스위치)는 **Slack · Jira를 실제로 부를지만** 정합니다. 손님 문자 · 메일은 어떤 모드에서도 실제로 보내지 않고 연습 기록만 남깁니다.

**병훈님이 정함**:

| 칸 | 정할 것 | 기준 |
| --- | --- | --- |
| 재시도 · timeout | `POST /tickets`의 `maxTries` · `waitBetweenTries` · `timeout` | 최악 시간 = 시도 × timeout + 기다림 < 본체 timeout 8초. 숫자를 설계서 7절에 |
| 개인정보 가림 | `title` · `summary`에서 전화 · 메일을 어디서 가릴지 | 티켓 · 알림 · DLQ에 연락처 0 (`GET /tickets-created`로 확인) |
| 알림 억제 | 같은 `reason`의 high 알림이 몇 분 안에 있으면 안 보낼지 | 76일차 Lab 02 과제 2. 공통 WF-04는 `tickets_down` 알림 1건을 셈 |
| 실제/연습 스위치 | `Handoff settings`의 `mode` 기본 `practice` | 한 곳만. 시연 때만 `real` |
| 덧붙임 순서 · timeout | 화면 · Slack · Jira | 실패해도 응답을 막지 않게 (각 2초 안팎) |
| DLQ 항목 | `item`에 무엇을 남길지 | 나중에 다시 처리(76 replay)할 수 있게, 연락처 · 약 이름 + 연락처 조합은 빼고 |

## 2. `team3-errors` (n8n, 파일 맨 위 `"id": "team3Errors00001"`)

- 고정: Error Trigger → data-api `POST /alerts` `{workflow, node, message (앞 200자), execution_id, severity: "critical", reason: "unexpected"}` + `POST /dlq`. 모든 팀 워크플로우의 `settings.errorWorkflow = "team3Errors00001"`. push(게시) 필수, 웹훅 500 뒤 1~3초 늦게 돈다.
- 병훈님이 정함: `mode = real`일 때 Jira 장애 티켓(`team3-ticket`)을 바로 부를지, 같은 워크플로우 오류를 몇 분 묶을지.

## 3. `api/` FastAPI (조합 C 뒷단)

**고정 — 경로와 모양** (화면 · n8n이 이 모양을 봄, `web/`은 리드가 만듦). 예시 요청 · 응답은 `contracts/examples/api.json`이고 pytest도 그 파일을 씁니다:

| 경로 | 누가 부르나 | 요청 | 응답 |
| --- | --- | --- | --- |
| `GET /health` | 모두 | — | `{"status":"ok","store":"memory"|"postgres"}` |
| `POST /api/ask` | 화면 `/` | 머리글 `X-Entry-Code`, 본문 `{user, question, attempt?, context?}` | 계약 응답 그대로 (n8n `team3-support` 호출, `request_id`는 API가 만듦). n8n이 멈추면 `route: 담당자 이관`, `reason: brain_down` |
| `GET /api/my-requests?user=` | 화면 `/my` | `X-Entry-Code` | `{"items": [{request_id, question, route, ticket, created_at}]}` 그 사용자 것만 |
| `GET /api/admin/tickets?status=` | 화면 `/admin` | `X-Entry-Code`, `X-User` (이름을 `encodeURIComponent` 한 값, 약사 · 약국장만, 아니면 403) | `{"items": [{ticket_id, key, title, requester, category, priority, status, created_at}]}` |
| `PATCH /api/admin/tickets/{id}` | 화면 `/admin` | `{status?, note?}` | 바뀐 티켓 |
| `GET /api/admin/alerts` | 화면 `/admin` | 약사 · 약국장 | `{"items": [...]}` 회수 공표 · 긴급 알림 |
| `POST /api/admin/tickets/{id}/recall-notice` | 화면 `/admin` (약사만) | — | `{"notices": [{customer_id, phone(가림), status: "practice_logged"}], "count"}` |
| `POST /tickets` | n8n handoff | 머리글 `X-Api-Key`, data-api와 같은 본문 (+ 선택 `ticket_id`: data-api가 준 번호를 그대로 씀, `product`) | 201 `{ticket_id, duplicate: false}` / 같은 `key`면 200 `duplicate: true` |
| `POST /alerts` | n8n handoff | `X-Api-Key`, data-api와 같은 본문 | `{"stored": 1, "count"}` |
| `GET /api/types` | 화면 | — | `config/type-policy.json`의 `{type, label, examples}` 목록 |
| `GET /api/users` | 화면 (사용자 고르기) | — | `{"items": [{name, role}]}` (연락처 없음) |
| `GET /stock/{name}` | (품절 팩 자리) | — | 품절 팩이 꺼져 있으면 404 `{"error":"stockout pack off"}` |

- 역할은 `data/users.json`의 `role`로 판단 (질문 · 요청 본문의 말로 판단하지 않음). 운영이라면 SSO라고 설계서에 적습니다.
- 회수 손님 안내: 그 티켓의 `product`를 산 손님 중 `recall_consent: true`만, **실제 발송 없음 · 연습 기록만**, 기록에 약 이름과 연락처를 같이 두지 않음 (`notices`엔 `ticket_id` · `customer_id` · 안내문만, 안내문엔 약 이름 없음).
- 키는 `.env` (`TEAM3_ENTRY_CODE` · `TEAM3_API_KEY` · `N8N_WEBHOOK_URL` · `N8N_WEBHOOK_KEY` · `DATABASE_URL`), `.env.example`만 커밋.

**지금 뼈대** (`api/`): `app/main.py` (위 경로 전부, 메모리 저장소로 동작), `app/store.py` (`MemoryStore` 완성, `PgStore`는 자리), `app/schema.sql` (표 초안), `tests/` (pytest 6개). 실행 · 시험 명령은 `api/README.md`.

**병훈님이 정함**:

| 칸 | 정할 것 | 기준 |
| --- | --- | --- |
| DB 표 | `requests` · `tickets` · `alerts` · `stock` (+ 회수 안내 `notices`) 칸 · 색인 · 기본키 | `schema.sql`은 초안. `tickets.key` 유일 (멱등) |
| 저장소 교체 | `PgStore` 구현 (psycopg / SQLAlchemy 등) | `DATABASE_URL`이 있으면 PostgreSQL, 없으면 메모리. 같은 시험이 둘 다 통과 |
| n8n 호출 | timeout · 재시도, 멈췄을 때 응답 | 화면이 오래 멈추지 않게 (예: 15초 안), 실패는 계약 모양으로 |
| 오류 응답 | 400 · 401 · 403 · 404 본문 모양 | 화면이 보여 줄 짧은 한국어 문장 |
| 기록 | 요청 로그에 무엇을 남길지 | 질문 · 답 글자 전체와 연락처는 남기지 않음 |

## 4. 완료 기준

```bash
cd ~/aio-p4-3rd-team-pharm/api && uv run --python 3.12 --with fastapi --with httpx --with pytest python -m pytest -q          # 뼈대 시험 + 내가 더한 시험 통과
cd ~/aio-01d4-stu/Last3Mon/77
uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-handoff.json && uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-errors.json
uv run tools/flow.py call team3-handoff ~/aio-p4-3rd-team-pharm/requests/handoff-sample.json      # 201 티켓, 같은 요청 다시 → duplicate: true
uv run tools/flow.py call team3-handoff ~/aio-p4-3rd-team-pharm/requests/recall-announce.json     # high → 알림 1, 약사 화면에 회수 티켓
```

- `fault tickets error` → 200 · `ticket: null` · `reason: tickets_down` · DLQ 1 · 알림 1 (WF-04). `fault tickets flaky` → 재시도로 성공, 티켓 1건. 끝나면 `fault all ok`.
- 본체에 일부러 `throw`를 넣으면 2~3초 뒤 `alerts/latest` critical + DLQ 1 (Error Workflow 증명, 결과서 실패 사례 재료).
- 공통 WF-04 · 09 · 10 · 11이 본체와 붙여서 통과. `docs/WORKFLOW-DESIGN.md` 5 · 6 · 7절 채움 (연습용 → 실제 운영 두 줄씩: Header Auth → OAuth, `/tickets` → Jira, `/alerts` → Slack, 오류 코드 · 한도).

## 5. 막혔을 때

| 증상 | 할 일 |
| --- | --- |
| 티켓이 두 개씩 생김 | `key`에 `request_id`를 넣었는지, 재시도가 key 없이 보내는지 |
| WF-04 알림이 2건 | 보통 이관에서도 알림을 보내는지 (high · 실패만 보냄), 억제 규칙 |
| Error Workflow가 안 돎 | 게시했는지, 본체 settings에 `team3Errors00001` |
| 화면에 티켓이 안 뜸 | handoff 덧붙임의 FastAPI 주소 (`extras.screen`), `X-Api-Key` |

## 6. 금지

- 워크플로우 안에서 고장 스위치 · reset · clear 호출, `key` 없는 `POST /tickets`, 실패를 성공으로 바꾸기, 알림 폭주, 실제 문자 · 메일 발송, 실제 계정 키를 JSON · 문서에, 서브에이전트 · `/review`.

## 7. 에이전트 요청문 뼈대 (내가 정한 값을 채워서)

```text
AGENTS.md, 00-DESIGN.md 3·4·9절, specs/03-backend.md 를 읽고 workflows/team3-handoff.json 과 workflows/team3-errors.json 을 만들어 줘.
기록 순서는 specs/03-backend.md 1절 그대로 (data-api 먼저, 덧붙임은 실패 무시). 재시도 = <내 값>, timeout = <내 값>, 알림 억제 = <내 규칙>, mode 스위치는 <노드 이름> 한 곳.
노드 type/typeVersion 은 Last3Mon/76/AGENTS.md 5절의 검증된 것만, 출발점은 76/reference/lab02-example2-intake.json · lab02-example2-error-handler.json.
먼저 "어떤 실패가 어디로 가는지" 표를 보여 주고, flow.py check 오류 0 까지 고친 뒤 push 명령과 fault 연습 순서(error → flaky → slow → all ok)를 알려 줘.
(api/ 작업은 따로) api/README.md 와 3절 표를 읽고 PgStore 를 <내 방식>으로 구현해 줘. 기존 pytest 는 그대로 통과해야 해.
```
