# 6교시 외부 장애 · DLQ · 멱등 실저장 대조 + 첫 호출 / 캐시 (2026-11-06 15:05~15:12 KST)

> **고치기 전 = VM `25cc7c0` 실측 + node 시뮬(아래) · 고친 뒤 = VM `b93a749`** (= main `c579b94` #68 · #73 · #74 · #75 + #76 문서). 스크립트 VM `~/d81_6m.sh` · `~/d81_6m.py`.

- 확인자: 문태웅(리드, CC 6교시 탭) · VM 커밋 `b93a749 Merge pull request #76 from twlaude/haeden/d81-screen-doc` (전 `25cc7c0 Merge pull request #66 from twlaude/byunghoon/d81-assignee-store`) · **팀 VM 연습 모드**(Slack · Jira 안 감) → 끝나고 실제 모드 복귀
- 시각(VM UTC): 06:05:04 start / 06:05:04 before_practice / 06:06:58 practice / 06:08:22 deployed / 06:08:22 cold / 06:11:43 driver_done / 06:11:48 real · 단계 exit: before practice exit=0 · before wf10 exit=0 · practice exit=0 · driver exit=0 · real exit=0
- request_id 정책: 단계마다 `ops --reset` + `/cache-clear` 뒤 새 ID `d81-6m-060829-<칸>` — 멱등 시험(WF-09)만 같은 ID 2번. 캐시 · 중복 재사용은 신규 업무 시험으로 안 셈

## 배포 직후 콜드 첫 호출 (판정 안 셈)

- 배포(n8n 재시작 · 색인) 끝난 바로 뒤 새 ID 1번: **0m6.750s** (기준 8초)

## #68 고친 뒤 — T-47 어르신 '약국 몇 시까지 해요?' 1회 (13:36 #59 시험의 3/3 실패 기록은 `runs/pr59-66-vm-20261106.md` 그대로)

| request_id | HTTP | route | reason | ticket (번호 · 담당 · 긴급도) | 걸린 시간 |
| --- | --- | --- | --- | --- | --- |
| `d81-6m-060829-t47` | 200 | 담당자 이관 | no_evidence | T-2001 · owner · normal | 2.155초 |

## WF-04 티켓 API 장애 (`fault tickets error`)

| request_id | HTTP | route | reason | ticket (번호 · 담당 · 긴급도) | 걸린 시간 |
| --- | --- | --- | --- | --- | --- |
| `d81-6m-060829-wf04` | 200 | 담당자 이관 | tickets_down | null | 1.949초 |
| `d81-6m-060829-wf04-recall` | 200 | 담당자 이관 | tickets_down | null | 4.45초 |

- 실저장(WF-04 1건 뒤): DLQ **1** · 알림 **1** · data-api 접수 0 · PG 0
- 약사 긴급(회수)도 장애 중에 보낸 뒤: DLQ 2 · 알림 2
  - DLQ `d81-6m-060829-wf04` · other · normal · tickets_down · attempts 1
  - DLQ `d81-6m-060829-wf04-recall` · recall · high · tickets_down · attempts 1
  - 알림 [high] tickets_down · [other] owner에게 이관
  - 알림 [high] tickets_down · [recall] pharmacist에게 이관
- 고장 해제: `['✔ fault switch: {"faq": "ok", "tickets": "ok", "prompts": "ok", "usage": "ok", "dlq": "ok", "slow_seconds": 8.0}']` → 스위치 {'faq': 'ok', 'tickets': 'ok', 'prompts': 'ok', 'usage': 'ok', 'dlq': 'ok', 'slow_seconds': 8.0}

## WF-09 같은 요청 두 번 (보통 1쌍 · 약사 긴급 1쌍)

| request_id | HTTP | route | reason | ticket (번호 · 담당 · 긴급도) | 걸린 시간 |
| --- | --- | --- | --- | --- | --- |
| `d81-6m-060829-wf09` | 200 | 담당자 이관 | no_evidence | T-2001 · owner · normal | 1.522초 |
| `d81-6m-060829-wf09` | 200 | 담당자 이관 | no_evidence | T-2001 · owner · normal · duplicate | 0.2초 |
| `d81-6m-060829-wf09h` | 200 | 담당자 이관 | urgent | T-2002 · pharmacist · high | 4.574초 |
| `d81-6m-060829-wf09h` | 200 | 담당자 이관 | urgent | T-2002 · pharmacist · high · duplicate | 0.138초 |

- `d81-6m-060829-wf09`: data-api 접수 **1** · PG **1** ([('T-2001', 'owner')])
- `d81-6m-060829-wf09h`: data-api 접수 **1** · PG **1** ([('T-2002', 'pharmacist')])
- 알림 1 (긴급 1쌍 → 1이어야 중복 알림 없음): ['[recall] pharmacist에게 이관']

## WF-10 LLM 장애 — 고치기 전 (VM `25cc7c0 Merge pull request #66 from twlaude/byunghoon/d81-assignee-store` · #74 · #75 전 코드, pull 없이 연습 모드)

| request_id | HTTP | route | reason | ticket (번호 · 담당 · 긴급도) | 걸린 시간 |
| --- | --- | --- | --- | --- | --- |
| `d81-6m-060631-wf10` | 200 | 담당자 이관 | llm_down | T-2001 · owner · normal | 2.077초 |
| `d81-6m-060631-wf10-risk` | 200 | 담당자 이관 | llm_down | T-2002 · owner · normal | 0.669초 |
| `d81-6m-060631-wf10-recall` | 200 | 담당자 이관 | llm_down | T-2003 · owner · high | 0.645초 |

- PG(장애 중 접수): [('-wf10-recall', 'owner', 'high'), ('-060631-wf10', 'owner', 'normal'), ('31-wf10-risk', 'owner', 'normal')] · 정상 대조 자동 답변

## WF-10 LLM 장애 — 고친 뒤 (`llm down`, VM 위 커밋)

| request_id | HTTP | route | reason | ticket (번호 · 담당 · 긴급도) | 걸린 시간 |
| --- | --- | --- | --- | --- | --- |
| `d81-6m-060829-wf10` | 200 | 담당자 이관 | llm_down | T-2001 · owner · normal | 1.041초 |
| `d81-6m-060829-wf10-risk` | 200 | 담당자 이관 | llm_down | T-2002 · pharmacist · high | 0.735초 |
| `d81-6m-060829-wf10-recall` | 200 | 담당자 이관 | llm_down | T-2003 · pharmacist · high | 0.576초 |

- 자동 답변 수(장애 중): 0 · 500 응답: 0
- PG(장애 중 접수): [('29-wf10-risk', 'pharmacist', 'high'), ('-wf10-recall', 'pharmacist', 'high'), ('-060829-wf10', 'owner', 'normal')] · 알림 ['[senior] pharmacist에게 이관', '[recall] pharmacist에게 이관']
- 복구 `['✔ OpenAI credential: real key from infra/.env restored']` → 정상 대조 1건:

| request_id | HTTP | route | reason | ticket (번호 · 담당 · 긴급도) | 걸린 시간 |
| --- | --- | --- | --- | --- | --- |
| `d81-6m-060829-wf10-after` | 200 | 자동 답변 | - | null | 3.365초 |

- 복구 뒤 `ops`: `['DLQ: 0 (parked 0)', 'alerts: 2', '  [high] team3-handoff · urgent · Handoff · [senior] pharmacist에게 이관', '  [high] team3-handoff · urgent · Handoff · [recall] pharmacist에게 이관']`

## 쉬다 온 첫 호출 (새 ID, 캐시 없음)

| 쉰 시간 | 걸린 시간 | 응답 timings.total_ms |
| --- | --- | --- |
| 바로 | 3.815초 | 3650 |
| 30초 | 3.785초 | 3618 |
| 90초 | 3.778초 | 3632 |

## bench — 첫 호출(캐시 없음) vs 캐시 응답

- (a) 새 request_id 5개 = 전부 첫 호출: 3.44초 · 3.544초 · 3.664초 · 3.67초 · 3.557초 → 중앙값 **3.56초** · 최대 3.67초 · route ['자동 답변', '자동 답변', '자동 답변', '자동 답변', '자동 답변']
- (b) 같은 request_id 5번 (`runs/bench-team3-support-20261106-061143.json`): 1번째(첫 호출) **3.78초** · 2~5번째(캐시) 0.14 · 0.15 · 0.13 · 0.13초 → 캐시 중앙값 **0.14초** · 전체 p50 0.145 · p95 3.778
  - 주의: 캐시 응답은 `timings.total_ms`를 첫 처리 값 그대로 돌려줌([3576, 3576, 3576, 3576, 3576]) → 캐시 시간은 클라이언트에서 잰 초로만 셈
## 약사 화면 PG 담당 — 새 요청 / 기존 요청 나눠서 (UPDATE 안 함)

- 새 요청(이번 request_id `d81-6m-060829-*`): 3행 · 담당별 {'owner': 1, 'pharmacist': 2} · 빈 담당 **0**
- 기존 · 남김: 81행 중 빈 담당 60 (#66 전 행 · 고정 request_id 재사용 · `ON CONFLICT DO NOTHING`, 지우거나 고치지 않음)


- PG 건수 읽는 법: `ops --reset`은 data-api만 비워서 다음 단계 번호가 다시 T-2001부터 나옴 → FastAPI upsert가 **같은 ticket_id의 다른 key 행을 지움**(`api/app/store.py`, 시험 `test_reused_ticket_id_replaces_stale_ticket`). 그래서 위 단계별 PG 숫자(WF-09 1 · 1 등)는 **그 단계 안에서 바로 센 값**이고, 끝난 뒤 남은 새 행 3개 = 마지막 단계(WF-10) 3건.

## 제한 재시도 · 시간 예산 — 설계서 vs 노드 (main `c579b94`)

| 항목 | 설계서 (`docs/WORKFLOW-DESIGN.md`) | 노드 설정 | 같음? |
| --- | --- | --- | --- |
| 재시도 대상 | 90줄 · 121줄 · 123줄: 5xx · timeout · 429만 1+2회 | `Retry needed?`: `!auth && (status >= 500 \|\| Number(status) === 429)` (timeout은 상태 없음 → 500으로 봄) | ✅ (#53 · #75 뒤) |
| 4xx 재시도 금지 | 120줄 401 · 403 = 재시도 없이 auth_failed. **400 · 404 · 422 줄은 없음** | 400 · 404 · 422 → retry false → DLQ + 알림 (`tickets_down`) | 코드 ✅ · 문서 빈칸 |
| 횟수 · 간격 · 시간 | 2초 timeout · 500ms 간격 · 최악 7초 < 본체 8초 | `Create ticket` timeout 2000 · `Retry ticket` retryOnFail · maxTries 2 · wait 500 · 본체 `Handoff` timeout 8000 | ✅ |
| POST 멱등 key | `{key, title, requester, category, priority}` | `Create ticket` · `Post to screen` 본문 `key = request_id` (헤더 아님) | ✅ |

node 시뮬 (`Retry needed?` · `Ticket outcome`에 상태 코드 10가지, fault 스위치에 4xx · 429 모드가 없어서 VM에선 재현 못 함):

```
ok 201 → 티켓 · 재시도 없음 / 400(숫자 · 문자) · 404 · 422 → 재시도 없음 · DLQ · 알림 · tickets_down
429(숫자 · 문자 '429') · 503 · timeout → 재시도 / 401 → 재시도 없음 · auth_failed · DLQ · 알림
```

VM 실측은 5xx 경로(`fault tickets error`)만: WF-04 1.95초 · 장애 중 회수 4.45초 → 시간 예산(8초) 안.

## LLM 장애 — 고치기 전 / 고친 뒤 node 시뮬 (`Type policy`, 24760f8 → c579b94, 24사례 × LLM 정상 · 장애)

```
  직원 회수       정상 | recall · evidence_handoff · evidence_handoff · pharmacist · high · urgent
≠ 직원 회수       장애 | recall · handoff_only · handoff_only · owner · high · llm_down  →  recall · handoff_only · handoff_only · pharmacist · high · llm_down
  직원 판매중지     정상 | recall · evidence_handoff · evidence_handoff · pharmacist · high · urgent
≠ 직원 판매중지     장애 | recall · handoff_only · handoff_only · owner · high · llm_down  →  recall · handoff_only · handoff_only · pharmacist · high · llm_down
  어르신 숨참      정상 | senior · evidence_handoff · evidence_handoff · pharmacist · high · risk_signal
≠ 어르신 숨참      장애 | other · handoff_only · handoff_only · owner · normal · llm_down  →  senior · handoff_only · handoff_only · pharmacist · high · llm_down
  어르신 어지럼     정상 | senior · evidence_handoff · evidence_handoff · pharmacist · high · risk_signal
≠ 어르신 어지럼     장애 | other · handoff_only · handoff_only · owner · normal · llm_down  →  senior · handoff_only · handoff_only · pharmacist · high · llm_down
  어르신 두드러기    정상 | senior · evidence_handoff · evidence_handoff · pharmacist · high · risk_signal
≠ 어르신 두드러기    장애 | other · handoff_only · handoff_only · owner · normal · llm_down  →  senior · handoff_only · handoff_only · pharmacist · high · llm_down
  어르신 직접      정상 | senior · evidence_handoff · evidence_handoff · pharmacist · normal · needs_person
≠ 어르신 직접      장애 | senior · evidence_handoff · evidence_handoff · pharmacist · normal · needs_person  →  senior · handoff_only · handoff_only · pharmacist · normal · llm_down
  어르신 사실      정상 | senior · auto · auto · pharmacist · normal · -
≠ 어르신 사실      장애 | other · handoff_only · handoff_only · owner · normal · llm_down  →  senior · handoff_only · handoff_only · pharmacist · normal · llm_down
  어르신 판단      정상 | senior · clarify · evidence_handoff · pharmacist · normal · needs_person
≠ 어르신 판단      장애 | other · handoff_only · handoff_only · owner · normal · llm_down  →  senior · handoff_only · handoff_only · pharmacist · normal · llm_down
  어르신 날씨      정상 | other · clarify · handoff_only · owner · normal · -
  어르신 날씨      장애 | other · handoff_only · handoff_only · owner · normal · llm_down
  어르신 영업      정상 | other · handoff_only · handoff_only · owner · normal · no_evidence
  어르신 영업      장애 | other · handoff_only · handoff_only · owner · normal · llm_down
  어르신 R조회     정상 | record_status · record_status · record_status · owner · normal · -
  어르신 R조회     장애 | record_status · handoff_only · handoff_only · owner · normal · llm_down
  직원 마감       정상 | closing · auto · auto · owner · normal · -
  직원 마감       장애 | closing · handoff_only · handoff_only · owner · normal · llm_down
  직원 결제       정상 | closing · clarify · auto · owner · normal · -
  직원 결제       장애 | other · handoff_only · handoff_only · owner · normal · llm_down
  직원 냉장고      정상 | closing · evidence_handoff · evidence_handoff · pharmacist · high · urgent
≠ 직원 냉장고      장애 | closing · evidence_handoff · evidence_handoff · pharmacist · high · urgent  →  closing · handoff_only · handoff_only · pharmacist · high · llm_down
  직원 공유기      정상 | other · handoff_only · handoff_only · owner · normal · no_evidence
  직원 공유기      장애 | other · handoff_only · handoff_only · owner · normal · llm_down
  직원 정수기      정상 | other · handoff_only · handoff_only · owner · normal · no_evidence
  직원 정수기      장애 | other · handoff_only · handoff_only · owner · normal · llm_down
  직원 지게차      정상 | other · handoff_only · handoff_only · owner · normal · no_evidence
  직원 지게차      장애 | other · handoff_only · handoff_only · owner · normal · llm_down
  직원 짧은말      정상 | other · clarify · handoff_only · owner · normal · no_evidence
  직원 짧은말      장애 | other · handoff_only · handoff_only · owner · normal · llm_down
  어르신 2턴 판단   정상 | senior · evidence_handoff · evidence_handoff · pharmacist · normal · needs_person
≠ 어르신 2턴 판단   장애 | other · handoff_only · handoff_only · owner · normal · llm_down  →  senior · handoff_only · handoff_only · pharmacist · normal · llm_down
달라진 줄 10

senior roles [ 'patient', 'staff', 'pharmacist', 'owner' ]
≠ 직원 약 재고     장애 | other · handoff_only · owner · normal · llm_down  →  senior · handoff_only · pharmacist · normal · llm_down
≠ 직원 손님 숨참    장애 | other · handoff_only · owner · normal · llm_down  →  senior · handoff_only · pharmacist · high · llm_down
≠ 약사 부작용      장애 | other · handoff_only · owner · normal · llm_down  →  senior · handoff_only · pharmacist · normal · llm_down
≠ 약국장 영양제     장애 | other · handoff_only · owner · normal · llm_down  →  senior · handoff_only · pharmacist · normal · llm_down
≠ 직원 감기약 위치   장애 | other · handoff_only · owner · normal · llm_down  →  senior · handoff_only · pharmacist · normal · llm_down
```
