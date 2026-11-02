# 01 · 오케스트레이션 명세 (설계판) — `workflows/team3-support.json`

> 설계판으로 직접 해 봐도 되고, 완전체본을 그대로 에이전트에 던져도 돼요. 설계판으로 하다가 막히면 완전체본의 같은 절을 보세요. (완전체본: [`01-orchestration-full.md`](01-orchestration-full.md))

- 맡은 사람: 다영 (+ 화면 QA 같이) · 마감: 11/5(목) · 별 ★★★
- 과제 한 문장: **문의 하나가 들어오면 검사 → 분류 → Type policy → 처리 방식 4개 → 출력으로 끝내는 본체 워크플로우.** 검색 · 티켓 · 알림은 하위 웹훅으로 부릅니다.
- 이 판은 **뼈대 + 설계 + 직접 정할 칸**입니다. 고정 칸(계약 · 꼭 있어야 할 노드 이름 · 완료 기준)은 완전체본과 같고, 나머지 노드 구성 · 지시문 · 수치는 직접 정해 설계서에 적습니다.

| 이 역할이 정하는 것 | 바꾸면 안 되는 것 |
| --- | --- |
| 노드를 몇 개로 나눌지, Agent 지시문, 보완 질문 문장, `SCORE_MIN` 처음 값, 재검색 루프를 넣을지, 판별(guard) Agent를 둘지 | 요청 · 응답 계약과 `route` 5개 값, 하위 웹훅 주고받는 칸, 처리 방식 4개와 `Type policy` 노드 이름 · `/*POLICY*/` 표시, 검사를 LLM 앞에, fail-closed |

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

# 4) 팀 설정 한 번에 — infra/.env 만들기 · n8n Credential 등록 · data-api 켜기 (샘 data-api는 알아서 멈춤)
cd ~/aio-p4-3rd-team-pharm && bash tools/setup.sh
#    처음엔 infra/.env만 만들고 멈춰요 → 맨 위 TEAM3_KEY= (와 OPENAI_API_KEY=) 뒤에 디코로 받은 값을 붙여 넣고 같은 줄을 한 번 더
#    infra/.env는 git에 안 올라가요. 키는 이 파일에만 두고 레포 · 문서에 쓰지 않기

# 5) 확인 — n8n 화면 Credentials에 team3WebhookKey · team3ApiKey가 보이고, 아래에 우리 문서 10개가 나오면 끝
curl -s localhost:8800/docs | head -c 300

# 6) flow.py는 샘 키트 폴더에서 실행하고, 파일은 레포 경로로 넘김
cd ~/aio-01d4-stu/Last3Mon/77 && uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-support.json

# 7) 내 작업은 내 브랜치에서 하고 PR로 올림 (main에 바로 push하지 않음, 합치는 건 리드)
cd ~/aio-p4-3rd-team-pharm && git switch main && git pull
git switch -c rag/search             # 브랜치 이름 = 역할/내용 (다영 orch · 영민 rag · 병훈 ops · 해든 qa · 태웅 web)
#   … 고치고 flow.py check · 단독 시험 통과 …
git add workflows/team3-search.json  # 내 파일만 (packs/를 고쳤으면 packs.py build 결과도 같이)
git commit -m "search: 단독 시험 3/3"
git push -u origin rag/search        # GitHub 레포 화면의 'Compare & pull request' → PR 설명에 시험 결과 → 리드가 보고 합침
#   합쳐진 뒤 다음 작업은 다시 7)의 첫 줄(main으로 가서 pull)부터 새 브랜치로
```

| n8n Credential 이름 (값은 n8n에만, 레포 · 문서에 쓰지 않음) | 쓰는 곳 |
| --- | --- |
| `OpenAI (.env)` | 채팅 `gpt-4.1-mini` · 임베딩 `text-embedding-3-large`. `infra/.env`에 우리 조 키를 넣으면 setup.sh가 그 키로 등록 (비우면 수업 때 것 그대로) |
| `team3WebhookKey` | 팀 웹훅 Header Auth (머리글 `X-Team-Key`, 값 = 팀 키). setup.sh가 등록 |
| `team3ApiKey` | n8n이 FastAPI(`POST /tickets` · `/alerts`)를 부를 때 머리글 `X-Api-Key` (값 = 팀 키). setup.sh가 등록 |
| `dataApiKey` | data-api로 나가는 호출의 `X-Api-Key` (80일차 키트에서 요구 — 키트 확인) |

- 지금 샘 시험 도구(77일차 `flow.py`)는 웹훅 키를 보내지 않아요. 그래서 노트북에서 시험할 땐 웹훅 노드 Authentication을 `None`으로 둡니다. 샘이 키를 보내는 도구를 주면 그때 Header Auth(`team3WebhookKey`)로 바꾸고 터미널에서 `export FLOW_WEBHOOK_KEY=<팀 키>`를 합니다 (리드가 알려 줌, 키트 확인). 가짜 웹훅(`workflows/stubs/`)은 처음부터 인증이 없습니다.

처음 보는 말은 [README 용어 표](../README.md#용어)에 있어요. 공통 시나리오 번호 뜻 (`cases/common.json`, 자세히는 `00-DESIGN.md` 7절): WF-01 문서로 답 · WF-02/02b 정보 부족 → 보완 질문, 3번째면 이관 · WF-03 문서에 없는 일 → 이관 · WF-04 티켓 API 장애 → DLQ · 알림 · WF-05 권한 밖 문서 (약국장 전용) · WF-06 남의 접수 건 · WF-07 연락처 가림 · WF-08 주입 공격 차단 · WF-09 같은 요청 두 번 → 티켓 1건 · WF-10 LLM 멈춤 · WF-11 접수 조회 지연 · WF-12 회수 긴급 + 접수 조회 · WF-13 잘못된 입력 → 400.

### 혼자 끝까지 확인하는 법

```bash
cd ~/aio-01d4-stu/Last3Mon/77
uv run tools/flow.py push ~/aio-p4-3rd-team-pharm/workflows/stubs/team3-search-stub.json ~/aio-p4-3rd-team-pharm/workflows/stubs/team3-handoff-stub.json ~/aio-p4-3rd-team-pharm/workflows/team3-support.json
uv run tools/flow.py test ~/aio-p4-3rd-team-pharm/cases/common.json --webhook team3-support -v   # Support settings: SEARCH=stub · HANDOFF=stub
uv run tools/flow.py test ~/aio-p4-3rd-team-pharm/cases/team.json -v
```
- 검색 · 이관이 가짜라 `sources` · `ticket` 같은 칸은 `contracts/examples/`의 예시값이 나와요. 검사 · 분류 · 처리 방식 갈림 · 보완 질문 · 접수 조회 · 가림은 이걸로 끝까지 확인됩니다. push는 n8n을 재시작하니 파일을 한 번에 넘깁니다.

### 가짜 먼저, 준비되면 바꿔 끼우기

계약이 먼저 고정돼 있어서 오늘부터 바로 시작합니다. 남의 부품이 없으면 `contracts/examples/`의 예시를 그대로 쓰는 가짜로 대신하고, 진짜가 준비되면 스위치 한 곳만 바꿉니다. 완료 목표는 11/5(목) 하나입니다.

| 바로 할 수 있는 것 | 남의 것이 필요한 것 | 그동안 쓰는 가짜 (`contracts/examples/`) | 바꿔 끼우는 법 |
| --- | --- | --- | --- |
| 입력 검사 · 캐시 · 차단 · 분류 · `Type policy` · 보완 질문 · 접수 조회 · 출력 필터 (data-api만 있으면 됨) | `team3-search` (영민) · `team3-handoff` (병훈) | 가짜 웹훅 `team3-search-stub` · `team3-handoff-stub` (`workflows/stubs/`, `search.json`의 `response` · `handoff.json`의 `response_ok`를 그대로 돌려줌) | `Support settings` 노드의 `SEARCH` · `HANDOFF`를 `stub` → `real` (부르는 주소가 `team3-search-stub` → `team3-search`로 바뀜) |
| ⏳ **진짜 부품이 붙어야 할 수 있는 것** | 공통 14유형 전체 통과 · `--repeat 3` (`SEARCH` · `HANDOFF`를 `real`로 바꾼 뒤). | — (가짜로는 못 함) | 연결 뒤 진짜로 잼 |

- `git pull` → `python3 tools/packs.py build`. 읽을 것: `00-DESIGN.md` 2 · 3 · 4절, `config/type-policy.json`, `AGENTS.md`.
- 가져다 쓸 실습: 72 `baseline-helpdesk` (뼈대) · 72 `lab02-example2-cache` (중복) · 72 `lab03-example2-llm-fallback` (LLM 멈춤) · 73 입력 검사 · 본인 건 · 출력 필터 · 71 근거 답변. 하위 웹훅이 없으면 가짜 웹훅(`workflows/stubs/`)을 push해 두고 `Support settings`를 `stub`으로 둡니다.

## 1. 만드는 것과 계약 (고정)

- 파일 하나, 웹훅 `POST /webhook/team3-support`, Header Auth `team3WebhookKey`. 응답은 `00-DESIGN.md` 2절의 칸을 늘 다 채웁니다.
- 처리 방식 4개: `auto` · `evidence_handoff` · `handoff_only` · `record_status`, 그 앞에서 끝나는 `deny` · `clarify`.
- 기록 · 티켓 · 알림은 `team3-handoff`가 합니다. 이 파일은 `Handoff`로 부르기만.

## 2. 노드 구성

**꼭 이 이름으로 있어야 하는 노드** (다른 사람 파일 · 도구 · 설계서가 이 이름을 봄):

| 노드 이름 | 왜 고정 |
| --- | --- |
| `Support webhook` | 계약 입구 |
| `Support settings` | **스위치 한 곳** (Code 노드 하나): `SEARCH` · `HANDOFF` = `stub` \| `real`, `SCORE_MIN`. 값은 n8n 화면에서 이 노드를 열어 그 한 줄만 고침 (JSON이면 `jsCode`) |
| `Search knowledge` · `Handoff`의 주소 | `SEARCH`가 `stub`이면 `http://localhost:5678/webhook/team3-search-stub`, `real`이면 `…/team3-search` (`HANDOFF`도 같음). 가짜는 `workflows/stubs/`의 별도 워크플로우라 본체 안에 가짜 노드를 두지 않음 |
| `Validate input` · `Reject invalid` | 400 `codes` (WF-13), LLM 앞 |
| `Injection rules` | 차단 (WF-08), LLM 앞 |
| `Triage` | Agent 1 (분류) |
| `Type policy` | `packs.py build`가 jsCode 안 `/*POLICY*/ … /*END*/`를 찾아 표를 바꿈 |
| `Route by mode` | 처리 방식 4개 + `deny` · `clarify` 갈림길 |
| `Search knowledge` · `Get record` · `Merge evidence` | 병렬 구조 (설계서 4절). 연결 전에는 주소가 `team3-search-stub` |
| `Writer` · `Verifier` | Agent 2 · 3 |
| `Handoff` | `team3-handoff` 호출. 연결 전에는 주소가 `team3-handoff-stub` |
| `Output filter` · `Send result` | 가림 (WF-07) · 출력 |

**`/*POLICY*/ … /*END*/` 사이는 손으로 고치지 않기** — `Type policy` Code 노드 안의 이 두 표시 사이에는 유형 표(유형 → 처리 방식 · 넘길 사람 · 위험 신호)가 들어갑니다. 왜: 유형 표를 `packs/` 한 곳에서 관리하려고. 언제: 누가 팩을 켜고 끄거나 팩 내용을 바꾼 뒤 `python3 tools/packs.py build`를 돌리면, `workflows/team3-support.json`이 있을 때 그 사이를 새 표로 자동으로 바꿉니다. 내가 할 일: 그 사이는 건드리지 않고 (고쳐도 다음 build 때 사라짐), 판단 코드는 `/*END*/` 뒤에 씁니다. build 뒤엔 본체를 다시 push.

**직접 정하는 것** (설계서 3 · 4절에 적기):

| 칸 | 정할 것 | 생각할 점 |
| --- | --- | --- |
| 중복 확인 | 캐시를 어디서 보고 저장하나 | WF-09 두 번째는 `ticket.duplicate: true`. 실패 결과도 저장해야 반복 시험에서 DLQ · 알림 수가 그대로 |
| `Type policy` 안의 판단 순서 | 역할 → `handoff_rules` → `ask_first` → `missing` → 접수 번호 | 표 칸 뜻은 `00-DESIGN.md` 3.2절. 막히면 완전체본 2.1 코드 |
| 근거 거르기 | `SCORE_MIN` 값 (검색 유사도 점수 0~1, 클수록 질문과 가까움 — 이보다 낮은 조각은 근거에서 뺌), 유형 `docs` 우선 정렬 | 처음엔 0.33, 영민이 우리 문서로 '답이 있는 질문 · 범위 밖 질문' 점수를 재면 그 값으로 바꿈 (문서마다 점수 분포가 달라 남의 실측을 그대로 못 씀). 71일차 실측: 규정 질문 0.46~0.62, 규정 밖 0.20~0.26 |
| 검증 실패 처리 | `auto` → 이관 / `evidence_handoff` → 정해진 문장 | 금지 문장 검사 (같이 드셔도 돼요 · 채우셔도 돼요)는 코드로 — 어르신 팩에서 봇이 복용 판단을, 마감에서 돈 결정을 하지 않게 막는 정규식 검사 (완전체본 2.3) |
| LLM 멈춤 | 오류 출력을 어디로 | WF-10: 500 아님, `reason: llm_down`, 자동 답변 0 |
| 접수 조회 지연 | timeout 값, 티켓을 만들지 | WF-11: 6초 안 200 |
| 루프 | 보완 질문(`attempt`)은 필수, 재검색 루프는 선택 | 끝(최대 횟수)을 숫자로 |

## 3. 입력 · 출력 예시

- 요청 · 응답 예: `00-DESIGN.md` 2절. `support → handoff` · `support → search` 본문: 3.3절.
- 시나리오별 기대: `00-DESIGN.md` 7절 (공통 14 · 팀 11). 예시 4개는 완전체본 3절.

## 4. 완료 기준 (완전체본과 같음)

```bash
uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-support.json                   # 오류 0
uv run tools/flow.py test ~/aio-p4-3rd-team-pharm/cases/common.json --webhook team3-support -v    # 공통 전부 PASS
uv run tools/flow.py test ~/aio-p4-3rd-team-pharm/cases/team.json -v                              # 팀 전부 PASS
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
