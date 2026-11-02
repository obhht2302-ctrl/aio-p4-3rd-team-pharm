# 01 · 오케스트레이션 명세 (설계판) — `workflows/team3-support.json`

> 설계판으로 직접 해 봐도 되고, 완전체본을 그대로 에이전트에 던져도 돼요. 설계판으로 하다가 막히면 완전체본의 같은 절을 보세요. (완전체본: [`01-orchestration-full.md`](01-orchestration-full.md))

- 맡은 사람: 다영 (+ 화면 QA 같이) · 마감: 11/5(목) · 별 ★★★
- 과제 한 문장: **문의 하나가 들어오면 검사 → 분류 → Type policy → 처리 방식 4개 → 출력으로 끝내는 본체 워크플로우.** 검색 · 티켓 · 알림은 하위 웹훅으로 부릅니다.
- 이 판은 **뼈대 + 설계 + 직접 정할 칸**입니다. 고정 칸(계약 · 꼭 있어야 할 노드 이름 · 완료 기준)은 완전체본과 같고, 나머지 노드 구성 · 지시문 · 수치는 직접 정해 설계서에 적습니다.

| 이 역할이 정하는 것 | 바꾸면 안 되는 것 |
| --- | --- |
| 노드를 몇 개로 나눌지, Agent 지시문, 보완 질문 문장, `SCORE_MIN` 처음 값, 재검색 루프를 넣을지, 판별(guard) Agent를 둘지 | 요청 · 응답 계약과 `route` 5개 값, 하위 웹훅 주고받는 칸, 처리 방식 4개와 `Type policy` 노드 이름 · `/*POLICY*/` 표시, 검사를 LLM 앞에, fail-closed |

## 0. 시작 전

**가짜 먼저, 준비되면 바꿔 끼우기** — 계약이 먼저 고정돼 있어서 오늘부터 바로 시작합니다. 남의 부품이 없으면 `contracts/examples/`의 예시를 그대로 쓰는 가짜로 대신하고, 진짜가 준비되면 스위치 한 곳만 바꿉니다. 완료 목표는 11/5(목) 하나입니다.

| 바로 할 수 있는 것 | 남의 것이 필요한 것 | 그동안 쓰는 가짜 (`contracts/examples/`) | 바꿔 끼우는 법 |
| --- | --- | --- | --- |
| 입력 검사 · 캐시 · 차단 · 분류 · `Type policy` · 보완 질문 · 접수 조회 · 출력 필터 (data-api만 있으면 됨) | `team3-search` (영민) · `team3-handoff` (병훈) | `Stub search` = `search.json`의 `response`, `Stub handoff` = `handoff.json`의 `response_ok` | `Support settings` 노드의 `SEARCH` · `HANDOFF`를 `stub` → `real` |

⏳ **진짜를 기다려야 하는 것**: 공통 14유형 전체 통과 · `--repeat 3` (`SEARCH` · `HANDOFF`를 `real`로 바꾼 뒤).

- `git pull` → `python3 tools/packs.py build`. 읽을 것: `00-DESIGN.md` 2 · 3 · 4절, `config/type-policy.json`, `AGENTS.md`.
- 가져다 쓸 실습: 72 `baseline-helpdesk` (뼈대) · 72 `lab02-example2-cache` (중복) · 72 `lab03-example2-llm-fallback` (LLM 멈춤) · 73 입력 검사 · 본인 건 · 출력 필터 · 71 근거 답변. 하위 웹훅이 없으면 위 표처럼 `Stub search` · `Stub handoff`로 가짜를 둡니다.

## 1. 만드는 것과 계약 (고정)

- 파일 하나, 웹훅 `POST /webhook/team3-support`, Header Auth `team3WebhookKey`. 응답은 `00-DESIGN.md` 2절의 칸을 늘 다 채웁니다.
- 처리 방식 4개: `auto` · `evidence_handoff` · `handoff_only` · `record_status`, 그 앞에서 끝나는 `deny` · `clarify`.
- 기록 · 티켓 · 알림은 `team3-handoff`가 합니다. 이 파일은 `Handoff`로 부르기만.

## 2. 노드 구성

**꼭 이 이름으로 있어야 하는 노드** (다른 사람 파일 · 도구 · 설계서가 이 이름을 봄):

| 노드 이름 | 왜 고정 |
| --- | --- |
| `Support webhook` | 계약 입구 |
| `Support settings` | **스위치 한 곳**: `SEARCH` · `HANDOFF` = `stub` \| `real` |
| `Stub search` · `Stub handoff` | `contracts/examples/search.json` · `handoff.json`의 응답을 그대로 돌려주는 가짜 |
| `Validate input` · `Reject invalid` | 400 `codes` (WF-13), LLM 앞 |
| `Injection rules` | 차단 (WF-08), LLM 앞 |
| `Triage` | Agent 1 (분류) |
| `Type policy` | `packs.py build`가 jsCode 안 `/*POLICY*/ … /*END*/`를 찾아 표를 바꿈 |
| `Route by mode` | 처리 방식 4개 + `deny` · `clarify` 갈림길 |
| `Search knowledge` · `Get record` · `Merge evidence` | 병렬 구조 (설계서 4절). 연결 전에는 `Stub search` |
| `Writer` · `Verifier` | Agent 2 · 3 |
| `Handoff` | `team3-handoff` 호출. 연결 전에는 `Stub handoff` |
| `Output filter` · `Send result` | 가림 (WF-07) · 출력 |

**직접 정하는 것** (설계서 3 · 4절에 적기):

| 칸 | 정할 것 | 생각할 점 |
| --- | --- | --- |
| 중복 확인 | 캐시를 어디서 보고 저장하나 | WF-09 두 번째는 `ticket.duplicate: true`. 실패 결과도 저장해야 반복 시험에서 DLQ · 알림 수가 그대로 |
| `Type policy` 안의 판단 순서 | 역할 → `handoff_rules` → `ask_first` → `missing` → 접수 번호 | 표 칸 뜻은 `00-DESIGN.md` 3.2절. 막히면 완전체본 2.1 코드 |
| 근거 거르기 | `SCORE_MIN` 값, 유형 `docs` 우선 정렬 | RAG가 잰 값으로 바꿈. 71일차 실측: 규정 질문 0.46~0.62, 규정 밖 0.20~0.26 |
| 검증 실패 처리 | `auto` → 이관 / `evidence_handoff` → 정해진 문장 | 금지 문장(같이 드셔도 돼요, 채우셔도 돼요)은 코드로 |
| LLM 멈춤 | 오류 출력을 어디로 | WF-10: 500 아님, `reason: llm_down`, 자동 답변 0 |
| 접수 조회 지연 | timeout 값, 티켓을 만들지 | WF-11: 6초 안 200 |
| 루프 | 보완 질문(`attempt`)은 필수, 재검색 루프는 선택 | 끝(최대 횟수)을 숫자로 |

## 3. 입력 · 출력 예시

- 요청 · 응답 예: `00-DESIGN.md` 2절. `support → handoff` · `support → search` 본문: 3.3절.
- 시나리오별 기대: `00-DESIGN.md` 7절 (공통 14 · 팀 11). 예시 4개는 완전체본 3절.

## 4. 완료 기준 (완전체본과 같음)

```bash
uv run tools/flow.py check <레포>/workflows/team3-support.json                   # 오류 0
uv run tools/flow.py test <레포>/cases/common.json --webhook team3-support -v    # 공통 전부 PASS
uv run tools/flow.py test <레포>/cases/team.json -v                              # 팀 전부 PASS
```

- 하위 워크플로우가 가짜일 때 먼저: WF-02 · 02b · 06 · 07 · 08 · 11 · 13. `--repeat 3` 흔들림 0.
- `docs/WORKFLOW-DESIGN.md` 2 · 3 · 4절을 실제 노드 이름으로 채움.

## 5. 막혔을 때

- 완전체본 같은 절 (특히 2.1 `Type policy` 코드, 2.4 `Output filter` 코드, 5절 표)을 봅니다.
- 분류가 흔들리면 판단을 코드(`handoff_rules`)로 옮길 수 있는지 리드에게.

## 6. 금지

- 계약 · `route` 값 변경, `cases/*.json` 기대 변경, 검색 · 티켓 · 알림을 이 파일에 다시 만들기, 키 · 연락처를 지시문에, `throw`, 서브에이전트 · `/review`.

## 7. 에이전트 요청문 뼈대 (빈칸을 내 설계로 채워서)

```text
AGENTS.md, 00-DESIGN.md 2·3·4절, specs/01-orchestration.md 를 읽고 workflows/team3-support.json 을 만들어 줘.
2절의 고정 노드 이름은 그대로 쓰고, 그 사이 구성은 이렇게: <내 노드 순서>.
Type policy 판단 순서: <내 순서>. SCORE_MIN = <값>. 검증 실패면 <처리>. LLM 오류 출력은 <노드>로.
노드 type/typeVersion 은 Last3Mon/71·72·73·76/AGENTS.md 5절의 검증된 것만.
먼저 노드 순서를 5줄로 보여 주고, flow.py check 오류 0 까지 고친 뒤 python3 tools/packs.py build, push · test 명령을 알려 줘.
```
