# 3팀 · 창고형 약국 업무 도우미 (team3-support)

가상 창고형 약국에서 일하는 직원·약사와 약국을 찾는 어르신이 묻는 것을 n8n 워크플로우가 받아, **약국 문서에 근거가 있으면 답하고, 사람이 정할 일은 약사·약국장에게 넘기는** 업무 지원 자동화입니다.

> 단위 프로젝트 80~82일차 (2026-11-05 목 ~ 11-09 월) · 주제 큰 틀: 노코드·로코드 기반 기업형 지능형 기술 지원 자동화
> 처음이면 [`docs/HANDBOOK.md`](docs/HANDBOOK.md)부터 (입문 길잡이: 내 명세 찾기 · 하루 순서), 무엇이 맞는지 헷갈리면 [`00-DESIGN.md`](00-DESIGN.md) (정답 기준 — 다른 문서와 다르면 00-DESIGN이 맞음).

```bash
git clone https://github.com/twlaude/aio-p4-3rd-team-pharm.git ~/aio-p4-3rd-team-pharm   # 처음
cd ~/aio-p4-3rd-team-pharm && git pull                                                   # 이미 있으면
```

## 무엇을 하나 (기능 3개로 시작)

| 기능 | 누가 묻나 | 봇이 하는 일 | 사람이 정하는 일 |
| --- | --- | --- | --- |
| 회수 공지가 떴어요 | 직원 | 회수 첫 조치를 문서로 알려 주고 약사에게 긴급으로 넘김 | 회수 대상 확인, 손님 안내문자 승인 (약사) |
| 혼자 하는 첫 마감 | 직원 | 마감 순서를 문서로 답함 | 현금 차액 처리 (약국장) |
| 어르신 약 질문 | 어르신(환자) | 공공 약 정보 문서를 인용해 답하고 확인 고지를 붙임, 위험 신호면 약사에게 넘김 | 복약 판단 (약사) |
| 내 접수 건 확인 | 모두 | 본인 건만 보여 주고 연락처는 가림 | — |

품절 안내·금액 설명은 시간이 남으면 켜는 기능으로 정의만 해 두었습니다 (`packs/stockout`, `packs/billing`).

## 흐름 한눈에

```text
직원 화면 · 어르신 화면 (Next.js)        ← 조합 C 입구 (A로 먼저 통과)
        │ POST /api/ask
FastAPI (api/) ── 정해 둔 요청 모양(계약)으로 바꿔서 ──▶ n8n team3-support (두뇌)
                                            입력 검사 → 분류 → Type policy → 처리 방식 4개
                                            ├ 자동 답변      (검색 → 답변 → 검증)
                                            ├ 근거 + 이관    (검색 → 답변 → team3-handoff)
                                            ├ 이관만         (team3-handoff)
                                            └ 접수 조회      (본인 건만, 연락처 가림)
team3-handoff ── 1) data-api 기록 (티켓 · 알림 · DLQ, 시험 기준)
               └ 2) 덧붙임: FastAPI 약사 화면 · Slack #support-alerts · Jira(장애만)  ← 실패해도 응답 안 막음
```

## 역할

| 역할 | 사람 | 명세 |
| --- | --- | --- |
| 리드 · 통합 + 시험 · 품질 | 태웅 | [`specs/05-lead.md`](specs/05-lead.md) · [`specs/04-test-and-qa.md`](specs/04-test-and-qa.md) · 완전체본 [`-full`](specs/04-test-and-qa-full.md) |
| 오케스트레이션 (+ 화면 QA 같이) | 다영 | [`specs/01-orchestration.md`](specs/01-orchestration.md) · 완전체본 [`-full`](specs/01-orchestration-full.md) |
| RAG | 영민 | [`specs/02-rag.md`](specs/02-rag.md) · 완전체본 [`-full`](specs/02-rag-full.md) |
| 연동 · 안정성 + 뒷단 | 병훈 | [`specs/03-backend.md`](specs/03-backend.md) |
| 화면(`web/`) | 해든 (직접 하고, 막히면 태웅 · 다영이 도와줌) | [`specs/06-screen.md`](specs/06-screen.md) |

설계판(`0N-<이름>.md`)은 뼈대 + 설계 + 직접 정할 칸, 완전체본(`0N-<이름>-full.md`)은 그대로 에이전트에 던지면 끝까지 가는 판입니다. 01 · 02 · 04는 두 벌, 03 · 05 · 06은 한 벌. 화면 QA 의견은 디코에 올리거나 해든에게 직접 주세요.

## 누가 누구를 기다리나

계약(요청 · 응답, 하위 웹훅 주고받는 칸, API 모양)이 `00-DESIGN.md`에 먼저 고정돼 있어서 **모두 오늘부터 동시에 시작**하고, 아직 없는 남의 부품은 가짜로 대신합니다.

| 사람 | 바로 할 수 있는 것 | 기다리는 것 | 그동안 가짜로 |
| --- | --- | --- | --- |
| 다영 | 검사 · 분류 · Type policy · 보완 질문 · 접수 조회 | 영민 search · 병훈 handoff | 가짜 웹훅 `team3-search-stub` · `team3-handoff-stub` (`workflows/stubs/`, 값은 `contracts/examples/`) |
| 영민 | 문서 검수 · index · search · 비교 실험 | 없음 | `flow.py call team3-search requests/search-*.json`으로 단독 시험 |
| 병훈 | handoff · errors · api | 없음 | `flow.py call team3-handoff requests/handoff-*.json` · `fault tickets error`, pytest |
| 해든 | 화면 3개 · 역할 막기 · 디자인 (가짜 응답으로) | 병훈 API (진짜 연결) | `contracts/examples/api.json` 가짜 응답 (`NEXT_PUBLIC_API_MODE=mock`) |
| 태웅 | 시나리오 · 기대값 검토, 시험 스크립트 · 결과서 틀, 문서 · 데이터 검수, Jira · Slack 틀, 팩 도구, VM 준비 | 다영 골격(공통 첫 실행) · 전체 연결 · 해든 화면(QA) | 가짜 본체 `team3-support-stub`으로 시험 · 결과서 표 연습 (결과서엔 안 씀), 400 · 차단은 골격만으로 통과 |

**가짜 먼저, 준비되면 바꿔 끼우기** (완료 목표는 11/5 목요일 하나): ① 각자 `contracts/examples/`의 가짜로 단독 시험 통과 → ② 영민 search가 준비되면 다영 본체 `SEARCH=real` → ③ 병훈 handoff가 준비되면 `HANDOFF=real` → 태웅 공통 시나리오 실행 → ④ 병훈 API가 준비되면 화면 `NEXT_PUBLIC_API_MODE=real` → ⑤ 11/5 키트 맞춤 · VM 첫 배포. 스위치는 본체 `Support settings` 노드와 화면 환경 변수 한 곳씩뿐입니다.

⏳ **진짜 부품이 붙어야 할 수 있는 것** (가짜로는 못 함): RAG 청킹 비교 · hit@k · 점수 기준 (문서 검수 뒤), 공통 14유형 전체 통과 · LLM 3회 반복 · bench (본체 + 하위 연결 뒤), 실행 결과서 숫자 (11/5 VM 배포 뒤 실제로 잰 값만 — 노트북 · 가짜로 잰 숫자는 결과서에 쓰지 않음).

**일정 (팀 확정)**: 11/5(목) 개발 완료 → 그날 VM 배포 · 실제 측정 (공통 시나리오 전체, 3회 반복, bench) / 11/6(금) 발표 준비 날: 실행 결과서 · 설계서 숫자 채우기와 발표 자료, 샘 기능 동결 (8교시) / 11/9(월)은 발표만 (시간이 거의 없어 문서 작업은 계획하지 않음).

## 시작 전 준비 (README · 모든 명세에 같은 내용)

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

# 6) flow.py는 레포의 tools/flow.py(샘 77판 + 팀 Credential 허용)를 레포 폴더에서 실행
cd ~/aio-p4-3rd-team-pharm && uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-support.json

# 7) 내 작업은 내 브랜치에서 하고 PR로 올리기 (main에 바로 push하지 않음, 합치는 건 리드)
cd ~/aio-p4-3rd-team-pharm && git switch main && git pull
git switch -c rag/search             # 브랜치 이름은 역할/내용 (다영 orch · 영민 rag · 병훈 ops · 해든 web · 태웅 qa)
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

## 바로 실행 (노트북)

```bash
# 1) 우리 팩으로 knowledge/ · data/ · cases/team.json · config/ 만들기
cd ~/aio-p4-3rd-team-pharm && python3 tools/packs.py build && python3 tools/packs.py check

# 2) 레포 tools/flow.py로 워크플로우 올리고 시험 (위 '시작 전 준비'를 끝낸 터미널에서)
cd ~/aio-p4-3rd-team-pharm
uv run tools/flow.py push ~/aio-p4-3rd-team-pharm/workflows/team3-*.json
uv run tools/flow.py call team3-index ~/aio-p4-3rd-team-pharm/requests/empty.json
uv run tools/flow.py test ~/aio-p4-3rd-team-pharm/cases/common.json --webhook team3-support -v
uv run tools/flow.py test ~/aio-p4-3rd-team-pharm/cases/team.json -v
```

화면과 API까지 한 번에 띄우는 법은 [`infra/README.md`](infra/README.md)에 있습니다.

## 웹훅 · Credential

| 웹훅 | 맡은 역할 |
| --- | --- |
| `POST /webhook/team3-support` (Header `X-Team-Key`) | 오케스트레이션 |
| `team3-index` · `team3-search` | RAG |
| `team3-handoff` · Error Workflow `team3-errors` | 연동 · 안정성 + 뒷단 |
| `team3-ticket`(Jira) · `team3-alert`(Slack) | 리드 |
| `team3-search-stub` · `team3-handoff-stub` · `team3-support-stub` | 가짜 (`workflows/stubs/`, 혼자 개발용 — 결과서에 쓰지 않음) |

| Credential 이름 (값은 n8n에만) | 용도 |
| --- | --- |
| `OpenAI (.env)` (`openAiCourse0001`) | gpt-4.1-mini · text-embedding-3-large |
| `team3WebhookKey` | 팀 웹훅 Header Auth |
| `dataApiKey` | data-api `X-Api-Key` (80일차 키트 확인) |
| `jiraAio3Cloud001` · `slackAio3Bot0001` | 가산: Jira 장애 티켓 · Slack 알림 |

## 폴더

```text
00-DESIGN.md      설계 기준 (계약 · 구조 · 권한 · 데이터 · 시나리오 · 역할 · 일정)
AGENTS.md         CLI 코딩 에이전트 규칙 (codex · claude)
specs/            역할별 명세 (01 · 02 · 04는 설계판 + 완전체본) — 각자 자기 것 하나만 에이전트에게 던짐
packs/            기능(팩)별 원본: 문서 · 시나리오 · 데이터, active.json = 켜진 팩
tools/packs.py    팩으로 아래 4개 폴더를 만드는 도구 (build · check · selftest)
knowledge/ data/ cases/team.json config/   ← 빌드 결과 (직접 고치지 말고 packs/에서)
cases/common.json 공통 시나리오 14개 (11/5 14:00 점검 뒤 고정)
contracts/examples/ 연결선마다 요청 · 응답 예시 — 모든 가짜(Stub · mock · pytest)가 이것을 씀
workflows/        n8n 워크플로우 JSON (한 사람 = 한 파일)
workflows/stubs/  가짜 웹훅 3개 (혼자 개발용, contracts/examples 값 그대로)
api/ web/ infra/  조합 C: FastAPI · Next.js 화면 · compose
requests/ runs/   시연·bench 요청 · 시험 보고서
docs/             제안서 · 헌장 · 설계서 2종 · 결과서 · 데일리
```

## 문제 해결

| 증상 | 할 일 |
| --- | --- |
| `call` 404 / 401 | push 했는지, 웹훅 노드 Authentication이 `None`인지 (지금 샘 도구는 웹훅 키를 안 보냄) |
| 검색 결과가 항상 비어 있음 | push 하면 n8n이 재시작돼 색인이 사라짐 → `team3-index`를 다시 부름 |
| 장애 시나리오 뒤 다른 시나리오가 실패 | `flow.py fault all ok` · `flow.py llm up` |
| `packs.py check` 실패 | 메시지에 나온 팩의 문서 · 시나리오 수를 채우거나 `packs/active.json`을 되돌림 |

## 용어

| 말 | 뜻 |
| --- | --- |
| 계약 | 부품끼리 주고받는 데이터 모양 (요청 · 응답 칸, `route` 값, 하위 웹훅 주고받는 칸, API 모양). `00-DESIGN.md` 2 · 3절, 예시 파일은 `contracts/examples/` |
| 조합 A · C | 샘 안내의 입구 · 뒷단 구성. A = 팀 웹훅 + data-api (공통 시나리오는 이걸로 판정), C = 웹 화면 + FastAPI (우리가 더하는 것) |
| 처리 방식 4개 | 자동 답변 (`auto`) · 근거 + 이관 (`evidence_handoff`) · 이관만 (`handoff_only`) · 접수 조회 (`record_status`). 본체는 유형 이름이 아니라 이 4개로 갈라짐 |
| `Type policy` | 유형마다 처리 방식 · 넘길 사람 · 위험 신호를 적은 표. 본체의 Code 노드 하나, 원본은 `config/type-policy.json` (팩에서 빌드) |
| 가짜 (stub · mock) | 남의 부품이 아직 없을 때 쓰는 대역. n8n은 가짜 웹훅 `workflows/stubs/` 3개, 화면은 가짜 응답. 값은 전부 `contracts/examples/` 그대로 |
| 스위치 | 가짜 → 진짜로 바꾸는 곳 두 군데: 본체 `Support settings` 노드의 `SEARCH` · `HANDOFF` (`stub` → `real`), 화면 환경 변수 `NEXT_PUBLIC_API_MODE` (`mock` → `real`) |
| 설계판 · 완전체본 | `specs/0N-<이름>.md` = 뼈대 + 직접 정할 칸, `-full.md` = 그대로 에이전트에 던지면 끝까지 가는 판 (01 · 02 · 04만 두 벌) |
| 공통 · 팀 시나리오 · 판정 | 공통 = 샘이 정한 14유형 (`cases/common.json`, WF-01~13), 팀 = 우리 기능 시험 (`cases/team.json`, T-xx). 판정 = 응답에서 확인할 칸과 기대값 (`equals` · `contains` · `range` …) |
| data-api | 샘이 주는 연습용 가짜 회사 서버 (티켓 · 알림 · DLQ · 직원 · 문서). 공통 시나리오가 여기 남은 기록으로 판정 |
| DLQ | 처리 못 한 요청을 잃지 않게 넣어 두는 대기열 (나중에 다시 처리) |
| `fault` · `llm` 명령 | 장애 연습 스위치. `flow.py fault tickets error` = 티켓 API 고장 → `fault all ok`로 되돌림, `flow.py llm down` = OpenAI 키를 일부러 깨뜨림 → `llm up`으로 되돌림 |
| 팩 (pack) · `active.json` | 기능 하나를 켜고 끄는 파일 묶음 (문서 + `Type policy` 한 줄 + 시나리오), `packs/<이름>/`. 사람의 일을 나누는 말이 아님. 켜진 팩 목록 = `packs/active.json` |
| 샘 키트 · 키트 확인 | 강사(샘) 실습 폴더 `~/aio-01d4-stu/Last3Mon/77` (`flow.py` · data-api, 80일차 키트가 나오면 `80`). 키트 확인 = 80일차 키트(11/5 공개)를 보고 맞출 곳 |
| 이관 | 사람에게 넘김 = 티켓 생성, 응답 `route: 담당자 이관` |
