# 01 · 오케스트레이션 명세 — `workflows/team3-support.json`

> 과제 본질 한 문장: **문의 하나가 들어오면 계약대로 검사→분류→검색·조회→답→검증→분기해서 route 5개 중 하나로 답하는 메인 워크플로우.** 계약·값·파일 이름은 `../00-DESIGN.md`(2·3·4절)가 기준.
> 규모 상한: 노드 ~30개, Agent 3개(분류·답변·검증) + 선택 판별 1개. 하위 호출 2개(search·handoff). 공통 14 + 팀 6 시나리오 통과가 완료 기준. 이 파일이 만드는 것 외(색인·검색·티켓·알림)는 **만들지 않고 웹훅으로 부른다.**

## 0. 시작 전
- `git pull` → 내 파일은 `workflows/team3-support.json` 하나. 다른 `workflows/*.json`은 읽기만.
- 읽을 것: `00-DESIGN.md` 2·3·4절, `AGENTS.md`, 샘 `Last3Mon/72/reference/baseline-helpdesk.json`(출발점, 노드 이름 재사용), `Last3Mon/73/AGENTS.md` 5절(입력 검증·규칙·판별·출력 필터), `Last3Mon/68`(라우터)·`69`(역할 카드·fail-closed).
- 하위 워크플로우가 아직 없으면 **가짜 응답**으로 개발: `team3-search`가 없을 땐 Code 노드 `Stub search`가 `00-DESIGN.md` 3.1절 모양의 evidence를 돌려주게 두고, 진짜가 push되면 HTTP Request로 바꾼다(노드 이름은 처음부터 `Search knowledge`).

## 1. 노드 표 (이름 고정 — 설계서 3·4절과 글자까지 같게)
| 순서 | 노드 이름 | 타입 | 하는 일 |
|---|---|---|---|
| 1 | `Support webhook` | webhook v2, path `team3-support`, responseMode responseNode, Header Auth `team3WebhookKey` | 계약 요청 받기 |
| 2 | `Check user` | httpRequest 4.2 `GET http://data-api:8800/employees/{{ encodeURIComponent(user) }}` neverError | 사용자·권한 확인 |
| 3 | `Validate input` | code 2 | `request_id`·`question`(1~500, 공백 정리·마크다운 제거)·`user`(2번 200인지) → `{valid, codes, clean_question, dept, role, access_levels}` |
| 4 | `Valid?` | if 2.2 | false → `Reject invalid`(respondToWebhook 400 `{"error":"invalid request","codes"}`) |
| 5 | `Check cache` | httpRequest `GET /cache/{{request_id}}` neverError | 중복 요청 |
| 6 | `Cached?` | if | true → `Respond cached`(저장된 응답 그대로, `ticket.duplicate`가 있으면 true로) |
| 7 | `Injection rules` | code 2 (73일차 규칙 + NFKC·띄어쓰기 제거 비교) | `{blocked, rule}` |
| 8 | `Blocked by rule?` | if | true → `Blocked`(set: route 차단, security.blocked_by rule) → 출력 |
| 9 | `Injection guard` + `Guard model` | agent 3.1(Tool 없음, maxIterations 1, timeout 8000·maxRetries 0, onError continueErrorOutput) | JSON `{attack, reason}`; 못 읽으면 attack=true(fail-closed); 멈추면(오류 출력) `reason: llm_down`으로 이관 |
| 10 | `Triage` + `Triage model` | agent 3.1 | `00-DESIGN.md` 3.2절 JSON. 입력: clean_question, dept, role, attempt, context |
| 11 | `Parse triage` | code 2 | JSON 읽기, 못 읽으면 `type other`; `access_levels`에서 `needs_manager_docs`와 role 비교 → `권한 없음` 플래그 |
| 12 | `Route by type` | switch | `clinical`→13a · `recall`→13b · `missing && attempt<3`→`Ask more` · `missing && attempt>=3`→이관(attempt_limit) · 그 외→14 |
| 13a | `Clinical notice` | set | route 담당자 이관, reason out_of_scope, category store, 답 = "약사님 판단 영역" 1줄 + scope-and-escalation 근거 (search를 `query: "봇이 답하지 않는 것"`으로 한 번 호출해 sources 채움) |
| 13b | `Recall urgent` | set | priority high, reason urgent, category store → 14로 가서 근거(recall-procedure)+접수 상태도 받음 |
| 14 | `Search knowledge` | httpRequest `POST http://localhost:5678/webhook/team3-search` body `{query, access_levels, top_k:4, type}` timeout 6000 neverError | 병렬 갈래 A |
| 15 | `Get ticket status` | httpRequest `GET /tickets/{{ticket_id}}?requester={{user}}` timeout 4000 neverError, `ticket_id` 없으면 Code `Skip ticket`가 빈 값 | 병렬 갈래 B. 403 → `권한 없음` 플래그 |
| 16 | `Merge evidence` | merge v3 numInputs 2 → `Build context` code | 점수 정렬·SCORE_MIN 미만 제거·중복 제거·번호 붙이기 `[1]..`, 접수 상태 문장화(연락처 제거) |
| 17 | `Evidence?` | if | 비었거나 최고점 < SCORE_MIN → `No evidence`(reason no_evidence) → 이관. 경계(SCORE_MIN~+0.1)면 `Rewrite query` agent 1회 → 14 재호출(루프 최대 1, `rewrite_count`) |
| 18 | `Writer` + `Writer model` | agent 3.1 (Tool 없음) | 번호 붙은 발췌로만 답, `[n]` 인용, 금지: 복용·용량 판단 문장 |
| 19 | `Verifier` + `Verifier model` | agent 3.1 | JSON `{grounded, policy_ok, issues[]}`; 못 읽으면 grounded=false |
| 20 | `Confident?` | if | grounded&&policy_ok → 21 / 아니면 `Low confidence`(reason low_confidence) → 이관 |
| 21 | `Output filter` | code 2 (73일차) | 전화·메일·주민번호 가림, `masked` 수, `[n]`→`sources` 매핑 |
| 22 | `Handoff` | httpRequest `POST http://localhost:5678/webhook/team3-handoff` body 3.1절 timeout 8000 neverError | 이관 경로 공통 |
| 23 | `Build result` | code 2 | 계약 응답 조립(`agents` 지나간 역할, `timings`), 개인정보 없는 로그 본문 |
| 24 | `Save cache` | httpRequest `POST /cache/{{request_id}}` `{value: 응답, ttl: 600}` onError continue | 중복 방지 저장 |
| 25 | `Log request` | httpRequest `POST /logs`(키트 확인: 76판은 `/audit`) onError continue | 06 문서 4절 한 줄 |
| 26 | `Send result` | respondToWebhook 1.1 | 200 |
- 분기: 신뢰도(17·20)·권한(11·15)·긴급(13b)·유형(12). 병렬: 14+15. 루프: 보완 질문(attempt, 요청 사이)·재검색(17, 요청 안 최대 1)·HTTP 재시도(노드 설정).

## 2. Agent 역할 카드 (설계서 4.1절에 그대로)
| 역할 | 입력 | 출력 | 하지 않는 것 |
|---|---|---|---|
| triage | clean_question, dept, role, attempt, context | 3.2절 JSON만 | 답하지 않음, 근거 안 봄 |
| writer | 질문 + 번호 붙은 발췌 + 접수 상태 문장 | 한국어 답(해요체) + `[n]` | 발췌 밖 내용, 복용·용량 판단, 약속 |
| verifier | 질문, 답, 발췌 | `{grounded, policy_ok, issues}` | 답을 다시 쓰지 않음 |
| guard(선택) | 원문 | `{attack, reason}` | 답하지 않음 |
- 지시문에 비밀·연락처·내부 메모 없음. 질문은 `<question>` 태그 안 데이터로 취급(73일차).

## 3. 완료 기준
- `uv run flow.py test cases/common.json --webhook team3-support` 14개 전부 PASS(하위 워크플로우 진짜 연결 뒤), `--repeat 3` 흔들림 0 (흔들리면 원인 기록).
- `cases/team.json` T-01~T-06 PASS.
- `agents` 칸에 지나간 역할이 정확히 들어감. `timings.total_ms`가 실제 측정.
- 설계서 2~4절 초안(흐름도 mermaid, 역할 카드, 분기·병렬·루프 표)을 `docs/WORKFLOW-DESIGN.md`에 채움. 노드 이름 = 위 표.

## 4. 금지
- 계약 칸·route 값 변경, `cases/*.json` 기대 변경, 하위 워크플로우 기능을 이 파일 안에 복제, 키·연락처를 지시문에, LLM 호출을 검사(3·7) 앞에 두기, `throw`로 워크플로우 멈추기(처리 가능한 실패는 결과로).
- 서브에이전트·`/review` 다중 에이전트 호출 금지. 셀프 diff 리뷰로.

## 5. 코덱스 요청문 (복붙)
```
00-DESIGN.md 2·3·4절과 specs/01-ORCHESTRATION.md 1·2절의 노드 표를 읽고 workflows/team3-support.json을 만들어 줘.
출발점은 ~/aio-01d4-stu/Last3Mon/72/reference/baseline-helpdesk.json, 보안 노드는 Last3Mon/73/AGENTS.md 5절, Agent 설정은 Last3Mon/71/AGENTS.md 5절의 검증된 type/typeVersion만.
노드 이름은 표와 글자까지 같게. team3-search·team3-handoff는 HTTP Request로 부르되, 아직 없으면 같은 모양의 Stub Code 노드로 대체하고 어디를 바꾸면 되는지 주석으로.
SCORE_MIN은 Code 노드 맨 위 상수 0.45. 먼저 입력·노드 순서·결과 모양을 5줄로 보여 주고, flow.py check 통과까지 고친 뒤 push·test 명령을 알려 줘.
완료 기준은 cases/common.json WF-01·02·02b·03·05·06·08·13 (하위 워크플로우 없이도 통과 가능한 것) 먼저.
```
