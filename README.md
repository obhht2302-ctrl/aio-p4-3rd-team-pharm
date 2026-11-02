# 3팀 · 창고형 약국 업무 도우미 (team3-support)

가상 창고형 약국에서 일하는 직원·약사와 약국을 찾는 어르신이 묻는 것을 n8n 워크플로우가 받아, **약국 문서에 근거가 있으면 답하고, 사람이 정할 일은 약사·약국장에게 넘기는** 업무 지원 자동화입니다.

> 단위 프로젝트 80~82일차 (2026-11-05 목 ~ 11-09 월) · 주제 큰 틀: 노코드·로코드 기반 기업형 지능형 기술 지원 자동화
> 설계 기준은 [`00-DESIGN.md`](00-DESIGN.md) 하나입니다. 처음이면 [`docs/HANDBOOK.md`](docs/HANDBOOK.md)부터 읽으세요.

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
FastAPI (api/) ── 계약 모양으로 바꿔서 ──▶ n8n team3-support (두뇌)
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
| 리드 · 통합 | 태웅 | [`specs/05-lead.md`](specs/05-lead.md) |
| 오케스트레이션 | 다영 | [`specs/01-orchestration.md`](specs/01-orchestration.md) |
| RAG | 영민 | [`specs/02-rag.md`](specs/02-rag.md) |
| 연동 · 안정성 + 뒷단 | 병훈 | [`specs/03-backend.md`](specs/03-backend.md) |
| 시험 · 품질 + 화면 | 해든 (직접 하고, 막히면 태웅 · 다영이 도와줌) | [`specs/04-screen-and-test.md`](specs/04-screen-and-test.md) |

## 바로 실행 (노트북)

```bash
# 1) 우리 팩으로 knowledge/ · data/ · cases/team.json · config/ 만들기
python3 tools/packs.py build && python3 tools/packs.py check

# 2) 샘 도구로 워크플로우 올리고 시험 (샘 키트 경로는 각자 노트북 기준)
cd ~/aio-01d4-stu/Last3Mon/77            # 80일차 키트가 나오면 Last3Mon/80
export FLOW_WEBHOOK_KEY=<팀 키>           # 키 값은 팀장에게
uv run tools/flow.py push <이 저장소>/workflows/team3-*.json
uv run tools/flow.py call team3-index <이 저장소>/requests/empty.json
uv run tools/flow.py test <이 저장소>/cases/common.json --webhook team3-support -v
uv run tools/flow.py test <이 저장소>/cases/team.json -v
```

화면·API까지 한 번에 띄우는 법은 [`infra/README.md`](infra/README.md).

## 웹훅 · Credential

| 웹훅 | 맡은 역할 |
| --- | --- |
| `POST /webhook/team3-support` (Header `X-Team-Key`) | 오케스트레이션 |
| `team3-index` · `team3-search` | RAG |
| `team3-handoff` · Error Workflow `team3-errors` | 연동 · 안정성 + 뒷단 |
| `team3-ticket`(Jira) · `team3-alert`(Slack) | 리드 |

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
specs/            역할별 명세 5개 — 각자 자기 것 하나만 에이전트에게 던짐
packs/            기능(팩)별 원본: 문서 · 시나리오 · 데이터, active.json = 켜진 팩
tools/packs.py    팩으로 아래 4개 폴더를 만드는 도구 (build · check · selftest)
knowledge/ data/ cases/team.json config/   ← 빌드 결과 (직접 고치지 말고 packs/에서)
cases/common.json 공통 시나리오 14개 (11/5 14:00 점검 뒤 고정)
workflows/        n8n 워크플로우 JSON (한 사람 = 한 파일)
api/ web/ infra/  조합 C: FastAPI · Next.js 화면 · compose
requests/ runs/   시연·bench 요청 · 시험 보고서
docs/             제안서 · 헌장 · 설계서 2종 · 결과서 · 데일리
```

## 문제 해결

| 증상 | 할 일 |
| --- | --- |
| `call` 404 / 401 | push 했는지, `FLOW_WEBHOOK_KEY`가 맞는지 |
| 검색 결과가 늘 빔 | push 하면 n8n이 재시작돼 색인이 사라짐 → `team3-index`를 다시 부름 |
| 장애 시나리오 뒤 다른 시나리오가 실패 | `flow.py fault all ok` · `flow.py llm up` |
| `packs.py check` 실패 | 메시지에 나온 팩의 문서 · 시나리오 수를 채우거나 `packs/active.json`을 되돌림 |
