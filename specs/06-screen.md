# 06 · 화면 명세 (리드용) — `web/` Next.js 화면 3개

- 맡은 사람: 태웅 (Claude Code로 만듦) · QA: 해든 · 다영 (의견은 디코 또는 태웅에게 직접) · 마감: 11/5(목)
- 과제 한 문장: **한 앱에 화면 3개 (`/` 질문하기 · `/my` 내 문의 · `/admin` 약사 · 약국장)를 사용자 역할로 나누고, FastAPI(`api/`)만 부르는 정적 웹을 만든다.**
- 화면은 가산(조합 C)입니다. 공통 시나리오는 팀 웹훅으로 판정하므로 **화면 때문에 문서 · 필수 WF가 밀리면 화면을 멈춥니다.**

| 정하는 것 | 바꾸면 안 되는 것 |
| --- | --- |
| 배치 · 색 · 문구 · 컴포넌트 나누기, QA 의견 반영 순서 | API 경로와 모양 (`specs/03-backend.md` 3절), 역할별 접근 (`/admin`은 약사 · 약국장만), 웹훅 키 · API 키를 화면 코드에 넣지 않기, 어르신 답 끝 AI 고지, 연락처는 API가 가린 그대로 |

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

# 4) 팀 설정 한 번에 — infra/.env 만들기, n8n Credential 등록, data-api 켜기 (켜져 있던 샘 data-api는 스크립트가 멈춤)
cd ~/aio-p4-3rd-team-pharm && bash tools/setup.sh
#    처음 실행하면 infra/.env 파일만 만들고 멈춰요. 그 파일 맨 위 TEAM3_KEY= 뒤에 디코로 받은 팀 키를 붙여 넣고,
#    같은 명령을 한 번 더 실행하면 돼요. GPT 키는 수업 때 각자 받은 키(OpenAI (.env))를 그대로 써요.
#    infra/.env는 git에 올라가지 않아요. 키는 이 파일에만 두고 레포나 문서에는 쓰지 마세요.

# 5) 확인 — n8n 화면의 Credentials에 team3WebhookKey · team3ApiKey가 보이고, 아래 명령에서 우리 문서 10개가 나오면 끝
curl -s localhost:8800/docs | head -c 300

# 6) flow.py는 샘 키트 폴더에서 실행하고, 파일은 레포 경로로 넘김
cd ~/aio-01d4-stu/Last3Mon/77 && uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-support.json

# 7) 내 작업은 내 브랜치에서 하고 PR로 올리기 (main에 바로 push하지 않음, 합치는 건 리드)
cd ~/aio-p4-3rd-team-pharm && git switch main && git pull
git switch -c rag/search             # 브랜치 이름은 역할/내용 (다영 orch · 영민 rag · 병훈 ops · 해든 qa · 태웅 web)
#   … 고치고 flow.py check · 단독 시험 통과 …
git add workflows/team3-search.json  # 내 파일만 (packs/를 고쳤으면 packs.py build 결과도 같이)
git commit -m "search: 단독 시험 3/3"
git push -u origin rag/search        # 그다음 GitHub 레포 화면에서 'Compare & pull request'를 눌러 PR을 만들고, 설명에 시험 결과를 적어 주세요. 리드가 보고 합쳐요
#   PR이 합쳐진 뒤 다음 작업은 7)의 첫 줄(main으로 가서 pull)부터 다시 시작해 새 브랜치에서 해요
```

| n8n Credential 이름 (값은 n8n에만, 레포 · 문서에 쓰지 않음) | 쓰는 곳 |
| --- | --- |
| `OpenAI (.env)` | 채팅 `gpt-4.1-mini` · 임베딩 `text-embedding-3-large` (수업 때 각자 받은 키 그대로, 팀 VM은 리드가 넣음) |
| `team3WebhookKey` | 팀 웹훅 Header Auth (머리글 `X-Team-Key`, 값은 팀 키) |
| `team3ApiKey` | n8n이 FastAPI(`POST /tickets` · `/alerts`)를 호출할 때 보내는 머리글 `X-Api-Key` (값은 팀 키) |
| `dataApiKey` | data-api로 나가는 호출의 `X-Api-Key` (80일차 키트에서 요구 — 키트 확인) |

- `team3WebhookKey` · `team3ApiKey`는 `bash tools/setup.sh`가 `infra/.env`의 팀 키로 등록해요. 직접 만들 필요는 없어요.
- 지금 샘 시험 도구(77일차 `flow.py`)는 웹훅 키를 보내지 않아요. 그래서 노트북에서 시험할 땐 웹훅 노드 Authentication을 `None`으로 둬요. 샘이 키를 보내는 도구를 주면 그때 Header Auth(`team3WebhookKey`)로 바꾸고, 터미널에서 `export FLOW_WEBHOOK_KEY=<팀 키>`를 하면 돼요. 바꿀 때가 되면 리드가 디코로 알려요 (키트 확인). 가짜 웹훅(`workflows/stubs/`)은 처음부터 인증이 없어요.

처음 보는 말은 [README 용어 표](../README.md#용어)에 있어요. 공통 시나리오 번호 뜻 (`cases/common.json`, 자세히는 `00-DESIGN.md` 7절): WF-01 문서로 답 · WF-02/02b 정보 부족 → 보완 질문, 3번째면 이관 · WF-03 문서에 없는 일 → 이관 · WF-04 티켓 API 장애 → DLQ · 알림 · WF-05 권한 밖 문서 (약국장 전용) · WF-06 남의 접수 건 · WF-07 연락처 가림 · WF-08 주입 공격 차단 · WF-09 같은 요청 두 번 → 티켓 1건 · WF-10 LLM 멈춤 · WF-11 접수 조회 지연 · WF-12 회수 긴급 + 접수 조회 · WF-13 잘못된 입력 → 400.

### 혼자 끝까지 확인하는 법

```bash
cd ~/aio-p4-3rd-team-pharm/web && npm install
NEXT_PUBLIC_API_MODE=mock npm run dev    # contracts/examples/api.json 가짜 응답으로 화면 3개 → http://localhost:3000
# 진짜 API로 바꿔 끼우기: 뼈대 API(메모리 저장소) + 가짜 본체 team3-support-stub (다른 터미널)
cd ~/aio-p4-3rd-team-pharm/api && TEAM3_ENTRY_CODE=dev N8N_WEBHOOK_URL=http://localhost:5678/webhook/team3-support-stub uv run --python 3.12 --with fastapi --with uvicorn --with httpx uvicorn app.main:app --port 8000
cd ~/aio-p4-3rd-team-pharm/web && NEXT_PUBLIC_API_MODE=real NEXT_PUBLIC_API_BASE=http://localhost:8000 npm run dev
```
- 가짜 본체를 쓰려면 먼저 `cd ~/aio-01d4-stu/Last3Mon/77 && uv run tools/flow.py push ~/aio-p4-3rd-team-pharm/workflows/stubs/team3-support-stub.json`. 진짜 본체가 오면 `N8N_WEBHOOK_URL`의 `-stub`만 뺍니다.

### 가짜 먼저, 준비되면 바꿔 끼우기

계약이 먼저 고정돼 있어서 오늘부터 바로 시작합니다. 남의 부품이 없으면 `contracts/examples/`의 예시를 그대로 쓰는 가짜로 대신하고, 진짜가 준비되면 스위치 한 곳만 바꿉니다. 완료 목표는 11/5(목) 하나입니다.

| 바로 할 수 있는 것 | 남의 것이 필요한 것 | 그동안 쓰는 가짜 (`contracts/examples/`) | 바꿔 끼우는 법 |
| --- | --- | --- | --- |
| 화면 3개 · 역할 막기 · 디자인 | 병훈 `api/` (뼈대는 이미 메모리 저장소로 돎) | `api.json` → `web/lib/contract-examples.json` (`packs.py build`가 복사) → `lib/mock.ts` | `NEXT_PUBLIC_API_MODE=mock` → `real` (+ `NEXT_PUBLIC_API_BASE`) |
| ⏳ **진짜 부품이 붙어야 할 수 있는 것** | 실제 API와 한 바퀴 (질문 → 이관 → 약사 화면 → 손님 안내 연습 기록). | — (가짜로는 못 함) | 연결 뒤 진짜로 잼 |

- 뼈대: `web/` (Next.js 16.4.3 · React 19.2.0 · TypeScript, `output: "export"`). 파일만 있고 **설치는 안 함**: `cd web && npm install && npm run dev` (http://localhost:3000), 빌드 `npm run build` → `web/out/`.
- API는 `cd api && uv run --with fastapi --with uvicorn --with httpx uvicorn app.main:app --port 8000` (`api/README.md`).

## 1. 화면 3개

| 주소 | 누가 | 보이는 것 | 부르는 API |
| --- | --- | --- | --- |
| `/` 질문하기 | 직원 · 약사 · 약국장 · 환자 | 위: 사용자 고르기 (이름 목록) + 입장 코드 → 아래: 질문 칸 · 보내기 · 답 (근거 문서 이름, 티켓 번호, `route` 배지). 환자면 **어르신 약 질문 예시 버튼**과 큰 글씨 | `GET /api/users` · `GET /api/types` · `POST /api/ask` |
| `/my` 내 문의 | 고른 사용자 | 내 질문 목록 (시각 · `route` · 티켓 번호 · 이관 건 상태) | `GET /api/my-requests?user=` |
| `/admin` 약사 · 약국장 | `role`이 `pharmacist` · `owner` | 위: 회수 공표 · 긴급 알림 → 아래: 이관 티켓 목록 (긴급 먼저) · 상태 바꾸기 · 회수 티켓이면 **"손님 안내 보내기"** (약사만) → 결과: 동의한 손님 수, 가린 번호, "연습 기록 · 실제 발송 없음" | `GET /api/admin/alerts` · `GET /api/admin/tickets` · `PATCH /api/admin/tickets/{id}` · `POST /api/admin/tickets/{id}/recall-notice` |

- 로그인 대신 **사용자 선택 + 입장 코드**. 고른 사용자와 코드는 `sessionStorage`에 (새로고침해도 유지, try/catch). 모든 요청에 `X-Entry-Code` · `X-User` 머리글 (`X-User`는 `encodeURIComponent(이름)` — 머리글은 ASCII만 됨).
- `/admin` 막기: 화면에서 `role`이 약사 · 약국장이 아니면 안내 문장만 보이고 목록을 부르지 않음. **API도 403으로 한 번 더 막음** (주소를 직접 쳐도).
- 보완 질문(`route: 보완 질문`)이면 답 아래에 "이어서 답하기" 칸 → 같은 질문 + `context` + `attempt + 1`로 다시 보냄 (API가 새 `request_id`를 만듦).
- 어르신 답: `answer`에 AI 고지가 들어 있음 (본체가 붙임). 화면은 그대로 보여 주고 지우지 않습니다.

## 2. 파일 (`web/`)

| 파일 | 하는 일 |
| --- | --- |
| `app/layout.tsx` · `app/globals.css` | 공통 틀 · 색 토큰 · 위 메뉴 (질문하기 · 내 문의 · 약사 화면) |
| `app/page.tsx` | 질문하기 |
| `app/my/page.tsx` | 내 문의 |
| `app/admin/page.tsx` | 약사 · 약국장 |
| `lib/api.ts` | `fetch` 래퍼 (머리글, 오류 → 짧은 한국어 문장), `NEXT_PUBLIC_API_MODE=mock`이면 `lib/mock.ts` |
| `lib/mock.ts` | `lib/contract-examples.json` (= `contracts/examples/api.json`, `packs.py build`가 복사)을 그대로 돌려줌 |
| `lib/session.ts` | 고른 사용자 · 입장 코드 저장 |

## 3. 디자인 기준

- 차분한 한 가지 강조색 + 회색 계열, 배지 색은 `route` 5개 (자동 답변 초록 · 보완 질문 파랑 · 담당자 이관 주황 · 권한 없음 회색 · 차단 빨강) + 긴급은 빨간 테두리.
- 글: 해요체, 짧게. 오류 문장 예: "입장 코드가 맞지 않아요", "지금 서버가 응답하지 않아요. 잠시 뒤 다시 해 주세요."
- 어르신(환자) 모드: 글씨 18px 이상, 버튼 높이 48px 이상, 예시 버튼 3개 (`/api/types`의 senior `examples`).
- 휴대폰 폭 375px에서 가로 스크롤 없음, 표는 카드로 바뀜.
- 개인정보: 화면은 API가 가린 값만 보여 줌. 화면에서 번호를 다시 조합하지 않음.

## 4. 완료 기준

- `npm run build` 통과 (`web/out/` 생성), 가짜 응답 모드로 화면 3개 동작.
- API가 준비되면: `NEXT_PUBLIC_API_MODE=real` · `NEXT_PUBLIC_API_BASE=http://localhost:8000`으로 실제 API 연결 → 질문 · 내 문의 · 티켓 상태 바꾸기 · 손님 안내 (연습)까지 한 바퀴.
- 해든 QA 점검표 (`specs/04-test-and-qa-full.md` 5절) 전부 통과, 받은 의견 반영 여부를 `docs/qa/screen-qa.md`에.

## 5. 금지

- 화면 코드에 키 · 웹훅 주소 · 입장 코드 값, 화면에서 n8n 직접 호출 (늘 `api/` 경유), 실제 문자 발송 버튼, 외부 CDN 폰트 · 추적 스크립트.

## 6. Claude Code 요청문 (복붙)

```text
AGENTS.md, specs/06-screen.md, specs/03-backend.md 3절을 읽고 web/ 화면 3개를 완성해 줘.
지금 뼈대(app/ · lib/)를 출발점으로, 1절 표와 3절 디자인 기준대로. NEXT_PUBLIC_API_MODE=mock 이면 lib/mock.ts (contracts/examples/api.json 그대로) 가짜 응답으로 돌아야 해.
/admin 은 role 이 pharmacist · owner 일 때만 목록을 부르고, 손님 안내 보내기는 pharmacist 만.
npm run build 가 통과할 때까지 고치고, 375px 폭 캡처 3장(가짜 응답)을 docs/images/ 에 남겨 (이름 · 연락처는 가짜라도 가린 상태).
```
