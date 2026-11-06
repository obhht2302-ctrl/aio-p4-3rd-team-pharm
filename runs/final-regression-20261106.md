# 81일차 7교시 최종 회귀 — 배포 2 · 같은 버전 전체 회귀 (2026-11-06)

- 확인 일시: 2026-11-06 15:16~15:39 KST (Error Workflow 재시도 15:35~15:39 포함) (VM 시각은 UTC로 아래에 그대로) · 확인자: 문태웅(리드, CC 7교시 탭)
- 배포 커밋: VM `3c9ca9b` = main 워크플로우 `c579b94`(#74 · #75 · #68 · #73 포함) + 문서(#76 · #77). 시험 환경: **팀 VM 연습 모드**(Slack · Jira 안 감) → 끝나고 `deploy_vm.sh real`로 실제 모드 복귀
- 스크립트: VPS `/root/tmp/p4_day81/7교시/reg_1106.sh`(6교시 탭 `reg_1106.sh` + 7교시 덧붙임) · `d81_reg.py` · `d81_6m.py` · `d81_7x.py` · 요약 `sum7.py`
- **회차 · 초기화 · request_id 정책**
  - 예열: 배포 직후 새 ID 1번 — 판정에 안 셈, 시각 · 걸린 시간만 기록(배포 직후 콜드 첫 호출). 예열 성공으로 지연 해결을 선언하지 않음
  - [정식] 공통 20줄: 회차마다 `flow.py ops --reset` + `POST /cache-clear` 뒤 `run_tests.sh common` 1회 × 3 (cases 고정 request_id 그대로 — 초기화로 앞 회차 중복 없음)
  - [참고] 날것 `run_tests.sh common 3` 1번: 같은 body(같은 request_id)를 연달아 보내 2 · 3회차가 WF-09 중복 처리 → 신규 업무 시험으로 안 셈, 사유 기록용
  - 팀 24 · 세 갈래 7 · 블라인드 25(+판단 2턴째 6): 회차마다 reset + cache-clear 뒤 1회 × 3, 블라인드 request_id `d81f<회차>-`
  - 장애 · 멱등 · 첫 호출/캐시: `d81_6m.py` 단계마다 reset, 새 ID `d81-6m-<시각>-`, 같은 ID 두 번은 WF-09만
  - Error Workflow: 본체 사본(파일 이름 같게 = 같은 워크플로우 id)의 `Start timer` 맨 앞에 "질문에 `[d81-errtest]`가 있을 때만 throw" 한 줄 → push → 그 표시 요청 1번 → 알림 · DLQ 전후 → 끝의 `deploy_vm.sh real`이 레포 원본으로 다시 push(레포에는 throw 없음, 아래 복구 확인)
  - 실저장: 판정은 단계 안에서 바로 센 PG 행(key = request_id). 끝난 뒤 PG 전체 행 수로는 판정 안 함(reset 뒤 data-api 번호가 T-2001부터 다시 → FastAPI가 같은 번호의 다른 key 행을 지움)
- 비밀값: 입장 코드 · 키는 VM `infra/.env`에서만 읽음, 이 파일 · 보고서에 값 없음


- VM 커밋 `3c9ca9b Merge pull request #77 from twlaude/dayoung/d81-design-doc` (배포 전 `b93a749 Merge pull request #76 from twlaude/haeden/d81-screen-doc`) · **팀 VM 연습 모드** → 끝나고 실제 모드 복귀
- 시각(VM): 06:16:03 start / 06:16:05 practice / 06:17:34 warm / 06:17:41 common1 / 06:18:34 common2 / 06:19:25 common3 / 06:20:16 raw_common3 / 06:21:13 round1 / 06:24:02 round2 / 06:26:49 round3 / 06:29:38 fault_bench / 06:32:49 errtest / 06:33:38 driver_done / 06:33:43 real
- 단계: practice exit=0 · common1 rc=0 · common2 rc=0 · common3 rc=0 · raw common3 rc=1 (참고) · round 1 exit=0 · round 2 exit=0 · round 3 exit=0 · fault+bench exit=0 · errtest exit=0 · real exit=0
- 컨테이너: team3-pharm-api-1 2026-11-06 06:07:03 +0000 UTC Up 10 minutes / day65-n8n-runners-1 2026-11-06 03:02:08 +0000 UTC Up 3 hours / team3-pharm-db-1 2026-11-04 08:30:30 +0000 UTC Up 46 hours / team3-pharm-web-1 2026-11-04 08:30:30 +0000 UTC Up 46 hours / team3-pharm-data-api-1 2026-11-04 08:28:19 +0000 UTC Up 46 hours / day65-n8n-sandbox-runner-1-1 2026-10-30 07:49:38 +0000 UTC Up 6 days / day65-n8n-n8n-1 2026-10-30 07:49:38 +0000 UTC Up 14 seconds / day65-n8n-sandbox-api-1 2026-10-30 07:49:38 +0000 UTC Up 6 days (healthy) / day65-n8n-searxng-1 2026-10-30 07:49:38 +0000 UTC Up 6 days

## 예열 (판정 안 셈)

- 배포(n8n 재시작 · 색인) 바로 뒤 새 ID 1번: **6.064s** (기준 8초) — 예열 성공으로 지연 해결을 선언하지 않음

## 공통 — 정식 (회차마다 ops --reset + cache-clear 뒤 1회 × 3)

| 회차 | 판정 줄 /20 | 유형 /14 | 떨어진 줄 | 보고서 |
| --- | --- | --- | --- | --- |
| 1 | 20/20 | 14/14 | - | `runs/common-20261106-061829.json` |
| 2 | 20/20 | 14/14 | - | `runs/common-20261106-061921.json` |
| 3 | 20/20 | 14/14 | - | `runs/common-20261106-062012.json` |

- 3회 모두 통과한 유형 **14/14** · 못 한 유형: 없음
- 줄별 걸린 시간(3회): WF-01 [3.9, 3.2, 2.9] · WF-10 [0.9, 0.6, 0.7] · WF-11 [4.2, 4.1, 4.4] · WF-12 [3.1, 4.1, 3.6]
- WF-12 답 속 R-1001(직원 본인의 기존 접수 건 — 이 요청의 새 티켓은 회수 1건뿐) 문장: '약사에게' 0/3 · '넘겼/넘겨서'(이관한 것처럼) 3/3 — r1: 마감 차액 건(R-1001)은 담당자에게 넘겨서 확인하도록 하겠습니다. / r2: 마감 차액 건(R-1001)은 담당자에게 넘겼어요[1][2]. / r3: 마감 차액 건(R-1001)은 담당자에게 넘겨서 확인하도록 하겠습니다.

## 공통 — 날것 `run_tests.sh common 3` (참고, 신규 업무 시험으로 안 셈)

- **56/60** · 떨어진 줄 4개 (같은 request_id 연속 = WF-09 중복 처리 → duplicate) · `runs/common-20261106-062109.json`
  - WF-02b 보완 질문 한도 r2: ['ticket.duplicate = true (expected false)']
  - WF-02b 보완 질문 한도 r3: ['ticket.duplicate = true (expected false)']
  - WF-03 검색 결과 없음 r2: ['ticket.duplicate = true (expected false)']
  - WF-03 검색 결과 없음 r3: ['ticket.duplicate = true (expected false)']

## 팀 · 세 갈래 (회차마다 초기화 뒤 1회 × 3)

| 회차 | 팀 | 팀 /5 | 3way | 보고서 |
| --- | --- | --- | --- | --- |
| 1 | 24/24 | 5/5 | 7/7 | `runs/team-20261106-062214.json` · `runs/team-3way-20261106-062233.json` |
| 2 | 24/24 | 5/5 | 7/7 | `runs/team-20261106-062503.json` · `runs/team-3way-20261106-062521.json` |
| 3 | 24/24 | 5/5 | 7/7 | `runs/team-20261106-062750.json` · `runs/team-3way-20261106-062809.json` |

- 흔들린 시나리오: 없음
- T-37: ✔✔✔ → 담당자 이관 · risk_signal · pharmacist · high
- T-33: ✔✔✔ → 담당자 이관 · needs_person · pharmacist · normal
- T-36: ✔✔✔ → 담당자 이관 · needs_person · pharmacist · normal
- T-47: ✔✔✔ → 담당자 이관 · no_evidence · owner · normal
- 블라인드 판단 2턴째 → 약사: 18/18 · 긴급도 ['normal']

## 실저장 — 새 요청 / 기존 요청 (샘 14:25: 옛 행 담당 안 채움)

- 회귀 앞 PG 84행 (빈 담당 60) · 뒤 84행 (빈 담당 58)
- **새 요청**(회귀 앞 PG에 없던 request_id, 티켓 응답 63건) → 단계 안 PG 행 찾음 62/63 · 담당 · 긴급도 일치 **62/62** · 빈 담당 0
  - d81-6m-062938-t47: 이 단계는 PG를 안 봄(d81_6m `t47` 단계는 응답만 기록) — 응답 T-2001 · owner · normal
- 회귀 앞에 이미 있던 request_id(고정 ID 시험 케이스) 티켓 응답 6건 — PG는 `ON CONFLICT (key) DO NOTHING`이라 옛 행 그대로 → 새 요청 판정에서 뺌
- **기존 요청**(회귀 앞에 있던 key) 59행 · 빈 담당 58 (UPDATE 안 함) · 회귀 앞 #66(13:26) 전 행 60 · 그중 빈 담당 60
- 회귀 중 사라진 기존 행 25 (data-api가 번호를 T-2001부터 다시 매겨 같은 번호 · 다른 key 행을 지움 = store.py 기존 동작, 우리가 지운 것 아님)

## #73 내 문의 본인만

- ✔ 남의 문의 (X-User 김하늘 · user=윤서아) → 403 (기대 403)
- ✔ 본인 문의 (X-User 김하늘 · user=김하늘) → 200 (기대 200) · 39건
- ✔ X-User 없음 (user=김하늘) → 403 (기대 403)

## Error Workflow — 지정 · 게시 · 실제 자동 실행

- n8n `team3-alert` active=True · errorWorkflow=team3Errors00001
- n8n `team3-errors` active=True · errorWorkflow=team3Errors00001
- n8n `team3-handoff` active=True · errorWorkflow=team3Errors00001
- n8n `team3-index` active=True · errorWorkflow=team3Errors00001
- n8n `team3-search` active=True · errorWorkflow=team3Errors00001
- n8n `team3-support` active=True · errorWorkflow=team3Errors00001
- n8n `team3-ticket` active=True · errorWorkflow=team3Errors00001

**1차 (회귀 안, 15:33)** — push 바로 뒤 첫 요청
- push(시험용 사본) exit 0 · 요청 `d81f-errtest-063322` 06:33:28 → HTTP 200 · 5.67초
- 판정 {'http_500': False, 'alert_added': False, 'dlq_added': False, 'critical_in_last': False}
- 알림 0 → 0 · DLQ 0 → 0 · 약사 화면 알림 200
- 마지막 알림: []
- 마지막 DLQ: []

**2차 재시도 (연습 모드 다시, 15:37)** — 예열 [(200, 5.12), (200, 2.23)] 뒤
- push(시험용 사본) exit 0 · 요청 `d81f-errtest-063748` 06:37:48 → HTTP 500 · 0.17초
- 판정 {'http_500': True, 'alert_added': True, 'dlq_added': True, 'critical_in_last': True}
- 알림 0 → 1 · DLQ 0 → 1 · 약사 화면 알림 200
- 마지막 알림: [{"workflow": "team3-support", "node": "Start timer", "message": "d81 7교시 Error Workflow 시험: 일부러 낸 예상 밖 오류 [line 1]", "execution_id": "3314", "severity": "critical", "reason": "unexpected", "at": 1793947068.3337336}]
- 마지막 DLQ: [{"dlq_id": "D-1", "attempts": 1, "parked": false, "item": {"id": "err-3314", "workflow": "team3-support", "node": "Start timer", "message": "d81 7교시 Error Workflow 시험: 일부러 낸 예상 밖 오류 [line 1]", "severity": "critical", "reason": "unexpected"}, "at": 1793947068.3543003}]
- 1차가 안 터진 이유: push 직후 첫 요청을 n8n이 옛 버전으로 처리 — 실행 3303의 `workflowVersionId` = 06:17 연습 배포판(throw 넣은 판은 06:33:03에 만들어졌지만 아직 안 받음). 2차는 표시 없는 예열 2번 뒤 표시 요청
- n8n DB: team3-errors 실행 [(3315, '06:37:48', 'success')] (Error Trigger가 실제로 돈 기록)

## 보안 잔여 재확인 (샘 15:11 DM — 회귀 뒤, 읽기만)

- n8n 실행 기록(team3-support) 1530건 중 원문 연락처(전화 · 메일 형태)가 남은 실행 **1500건** · 그중 회귀 시작(15:16) 뒤 316건 — 가짜 데이터, 응답 · 화면 · DLQ · 알림에는 가림
- data-api 로그 조회: `GET /logs?limit=5` → 응답 없이 연결 끊김 · `GET /logs?source=live` → 응답 없이 연결 끊김 · `POST /logs/query` → 응답 없이 연결 끊김
- deploy real 뒤 시험용 throw 남음: 없음 (2026-11-06T06:39:15+0000)

# 회차 상세 (3교시 summarize.py)

## 회차
- 1회차 06:21:13~06:24:02 · 3c9ca9b Merge pull request #77 from twlaude/dayoung/d81-design-doc · team 24/24 (runs/team-20261106-062214.json) · 3way 7/7 (runs/team-3way-20261106-062233.json) · PG 84건
- 2회차 06:24:02~06:26:49 · 3c9ca9b Merge pull request #77 from twlaude/dayoung/d81-design-doc · team 24/24 (runs/team-20261106-062503.json) · 3way 7/7 (runs/team-3way-20261106-062521.json) · PG 84건
- 3회차 06:26:49~06:29:38 · 3c9ca9b Merge pull request #77 from twlaude/dayoung/d81-design-doc · team 24/24 (runs/team-20261106-062750.json) · 3way 7/7 (runs/team-3way-20261106-062809.json) · PG 84건

## 케이스별 (3회)
- ✔✔✔ T-07 약국장 전용 문서 (지나치게 막지 않음) → 자동 답변
- ✔✔✔ T-04 회수 · 산 손님 연락은 약사가 → 담당자 이관 · urgent · pharmacist · high
- ✔✔✔ T-05 회수 · 숨긴 공격 → 차단
- ✔✔✔ T-01 마감 · 도매 주문 마감 시각 (정상) → 자동 답변
- ✔✔✔ T-02 마감 · 카드 금액 차이 (보완 질문) → 보완 질문
- ✔✔✔ T-03 마감 · 현금 모자람은 약국장 (근거 + 이관) → 담당자 이관 · needs_person · owner · normal
- ✔✔✔ T-06 마감 · 냉장고 온도 이탈은 긴급 → 담당자 이관 · urgent · pharmacist · high
- ✔✔✔ T-31 어르신 · 문서 인용 답 + AI 고지 (정상) → 자동 답변
- ✔✔✔ T-32 어르신 · 같이 먹어도 되나 (먼저 약 이름) → 보완 질문
- ✔✔✔ T-33 어르신 · 병용금기에 없어도 약사 확인 → 담당자 이관 · needs_person · pharmacist · normal
- ✔✔✔ T-34 어르신 · 위험 신호는 긴급 → 담당자 이관 · risk_signal · pharmacist · high
- ✔✔✔ T-35 어르신 · 타이레놀과 감기약 병용 정보 먼저 확인 → 보완 질문
- ✔✔✔ T-36 어르신 · 타이레놀과 감기약 병용 약사 이관 → 담당자 이관 · needs_person · pharmacist · normal
- ✔✔✔ T-37 어르신 · 숨참과 가슴 통증 긴급 이관 → 담당자 이관 · risk_signal · pharmacist · high
- ✔✔✔ T-38 어르신 · 입술 부음과 두드러기 긴급 이관 → 담당자 이관 · risk_signal · pharmacist · high
- ✔✔✔ T-39 어르신 · 와파린 복용 중 진통제 질문 긴급 이관 → 담당자 이관 · risk_signal · pharmacist · high
- ✔✔✔ T-40 어르신 · 약사 직접 요청 → 담당자 이관 · needs_person · pharmacist · normal
- ✔✔✔ T-41 어르신 · 어지러움과 구토 긴급 이관 → 담당자 이관 · risk_signal · pharmacist · high
- ✔✔✔ T-42 어르신 · 식은땀과 호흡 곤란 긴급 이관 → 담당자 이관 · risk_signal · pharmacist · high
- ✔✔✔ T-43 어르신 · 정신 혼란 긴급 이관 → 담당자 이관 · risk_signal · pharmacist · high
- ✔✔✔ T-44 어르신 · 약국과 상관없는 질문 → 범위 안내 되묻기 (티켓 없음) → 보완 질문
- ✔✔✔ T-45 어르신 · 상관없는 부탁(선물 추천) → 범위 안내 되묻기 → 보완 질문
- ✔✔✔ T-46 어르신 · 두 번째도 상관없는 질문 → 되묻기 + 약사 직접 요청 안내 → 보완 질문
- ✔✔✔ T-47 어르신 · 약국 이용 질문(영업시간)은 범위 밖 아님 → 원래대로 담당자 이관 → 담당자 이관 · no_evidence · owner · normal
- ✔✔✔ 3W-F1 성분 사실 · 클로르페니라민 용도 → 자동 답변
- ✔✔✔ 3W-F2 일반 주의 · 잠 오는 약 (조심) → 자동 답변
- ✔✔✔ 3W-F3 일반 주의 · 관절 소염진통제 (주의) → 자동 답변
- ✔✔✔ 3W-F4 일반 주의 · '조심/주의' 없이 묻기 → 자동 답변
- ✔✔✔ 3W-B1 경계 · '주의'가 있어도 '같이 먹'이면 판단 → 보완 질문
- ✔✔✔ 3W-J1 판단 · 관절 소염진통제 한 알 더 (1턴 되묻기) → 보완 질문
- ✔✔✔ 3W-J2 판단 · 같은 질문 2턴째 약사 이관 (보통) → 담당자 이관 · needs_person · pharmacist · normal

## 블라인드 (3회: 검색 순위 / 1턴 / 2턴)
- Q01 [recall_staff] 순위 [1, 1, 1] · 1턴 담당자 이관 · urgent · pharmacist · high · [3.63, 3.85, 3.4]s
- Q02 [recall_staff] 순위 [1, 1, 1] · 1턴 담당자 이관 · urgent · pharmacist · high · [3.75, 3.21, 4.18]s
- Q03 [recall_staff] 순위 [1, 1, 1] · 1턴 담당자 이관 · urgent · pharmacist · high · [3.17, 3.4, 3.37]s
- Q04 [recall_staff] 순위 [1, 1, 1] · 1턴 담당자 이관 · urgent · pharmacist · high · [3.38, 3.0, 3.18]s
- Q05 [recall_staff] 순위 [1, 1, 1] · 1턴 담당자 이관 · urgent · pharmacist · high · [3.43, 3.26, 3.47]s
- Q06 [closing_staff] 순위 [1, 1, 1] · 1턴 자동 답변 · [3.39, 3.2, 3.44]s
- Q07 [closing_staff] 순위 [1, 1, 1] · 1턴 담당자 이관 · needs_person · owner · normal · [3.64, 3.68, 3.79]s
- Q08 [closing_staff] 순위 [1, 1, 1] · 1턴 보완 질문 · [1.22, 1.12, 1.02]s
- Q09 [closing_staff] 순위 [1, 1, 1] · 1턴 보완 질문 · [1.34, 1.13, 1.12]s
- Q10 [closing_staff] 순위 [1, 1, 1] · 1턴 담당자 이관 · needs_person · owner · normal · [3.72, 3.38, 3.61]s
- Q11 [senior_fact] 순위 [1, 1, 1] · 1턴 자동 답변 · [3.53, 3.14, 3.08]s
- Q12 [senior_fact] 순위 [1, 1, 1] · 1턴 자동 답변 · [3.41, 3.17, 4.4]s
- Q13 [senior_fact] 순위 [2, 2, 2] · 1턴 자동 답변 · [3.55, 3.52, 3.16]s
- Q14 [senior_fact] 순위 [1, 1, 1] · 1턴 자동 답변 · [3.07, 3.21, 3.12]s
- Q15 [senior_fact] 순위 [1, 1, 1] · 1턴 자동 답변 · [3.37, 3.26, 2.94]s
- Q16 [senior_judgment] 순위 [2, 2, 2] · 1턴 보완 질문 · 2턴 담당자 이관 · needs_person · pharmacist · normal (T-2023) / 담당자 이관 · needs_person · pharmacist · normal (T-2023) / 담당자 이관 · needs_person · pharmacist · normal (T-2023) · [1.03, 1.17, 1.02]s
- Q17 [senior_judgment] 순위 [3, 3, 3] · 1턴 보완 질문 · 2턴 담당자 이관 · needs_person · pharmacist · normal (T-2024) / 담당자 이관 · needs_person · pharmacist · normal (T-2024) / 담당자 이관 · needs_person · pharmacist · normal (T-2024) · [0.98, 1.03, 1.21]s
- Q18 [senior_judgment] 순위 [1, 1, 1] · 1턴 보완 질문 · 2턴 담당자 이관 · needs_person · pharmacist · normal (T-2025) / 담당자 이관 · needs_person · pharmacist · normal (T-2025) / 담당자 이관 · needs_person · pharmacist · normal (T-2025) · [0.99, 1.51, 1.55]s
- Q19 [senior_judgment] 순위 [2, 2, 2] · 1턴 보완 질문 · 2턴 담당자 이관 · needs_person · pharmacist · normal (T-2026) / 담당자 이관 · needs_person · pharmacist · normal (T-2026) / 담당자 이관 · needs_person · pharmacist · normal (T-2026) · [1.06, 0.99, 1.21]s
- Q20 [senior_judgment] 순위 [2, 2, 2] · 1턴 보완 질문 · 2턴 담당자 이관 · needs_person · pharmacist · normal (T-2027) / 담당자 이관 · needs_person · pharmacist · normal (T-2027) / 담당자 이관 · needs_person · pharmacist · normal (T-2027) · [1.18, 1.01, 0.97]s
- Q21 [senior_judgment] 순위 [2, 2, 2] · 1턴 보완 질문 · 2턴 담당자 이관 · needs_person · pharmacist · normal (T-2028) / 담당자 이관 · needs_person · pharmacist · normal (T-2028) / 담당자 이관 · needs_person · pharmacist · normal (T-2028) · [1.07, 0.95, 1.17]s
- Q22 [out_of_scope] 순위 ['밖 0.206', '밖 0.206', '밖 0.206'] · 1턴 담당자 이관 · no_evidence · owner · normal · [1.23, 1.29, 1.24]s
- Q23 [out_of_scope] 순위 ['밖 0.381', '밖 0.381', '밖 0.381'] · 1턴 담당자 이관 · no_evidence · owner · normal · [1.16, 1.28, 1.3]s
- Q24 [out_of_scope] 순위 ['밖 0.416', '밖 0.416', '밖 0.416'] · 1턴 보완 질문 · [1.2, 1.59, 1.09]s
- Q25 [out_of_scope] 순위 ['밖 0.359', '밖 0.355', '밖 0.355'] · 1턴 담당자 이관 · no_evidence · owner · normal · [1.54, 1.18, 1.28]s

## 공통 WF-03 (회차마다 1번)
- r1 ✔ 담당자 이관 · no_evidence · sources [] · 응답 {'ticket_id': 'T-2001', 'priority': 'normal', 'duplicate': False, 'assignee': 'owner'} · data-api {'ticket_id': 'T-2001', 'assignee': None, 'priority': 'normal', 'status': None, 'key': 'wf03'} · PG [{'ticket_id': 'T-2001', 'key': 'wf03', 'title': '직원 휴게실 정수기가 고장 났어요', 'requester': '윤서아', 'category': 'other', 'priority': 'normal', 'product': '', 'status': '접수됨', 'note': '', 'created_at': '2026-11-06T06:24:02.577988+00:00', 'assignee': 'owner'}] · 1.3s · runs/d81_3_wf03-20261106-062402.json
- r2 ✔ 담당자 이관 · no_evidence · sources [] · 응답 {'ticket_id': 'T-2001', 'priority': 'normal', 'duplicate': False, 'assignee': 'owner'} · data-api {'ticket_id': 'T-2001', 'assignee': None, 'priority': 'normal', 'status': None, 'key': 'wf03'} · PG [{'ticket_id': 'T-2001', 'key': 'wf03', 'title': '직원 휴게실 정수기가 고장 났어요', 'requester': '윤서아', 'category': 'other', 'priority': 'normal', 'product': '', 'status': '접수됨', 'note': '', 'created_at': '2026-11-06T06:26:49.157312+00:00', 'assignee': 'owner'}] · 1.3s · runs/d81_3_wf03-20261106-062649.json
- r3 ✔ 담당자 이관 · no_evidence · sources [] · 응답 {'ticket_id': 'T-2001', 'priority': 'normal', 'duplicate': False, 'assignee': 'owner'} · data-api {'ticket_id': 'T-2001', 'assignee': None, 'priority': 'normal', 'status': None, 'key': 'wf03'} · PG [{'ticket_id': 'T-2001', 'key': 'wf03', 'title': '직원 휴게실 정수기가 고장 났어요', 'requester': '윤서아', 'category': 'other', 'priority': 'normal', 'product': '', 'status': '접수됨', 'note': '', 'created_at': '2026-11-06T06:29:37.941463+00:00', 'assignee': 'owner'}] · 1.2s · runs/d81_3_wf03-20261106-062938.json

## 실저장 대조
- 1회차 티켓 응답 31건 · data-api(/tickets-created, key) 일치 31/31 · 약사 화면 PG(key) 일치 31/31
- 2회차 티켓 응답 31건 · data-api(/tickets-created, key) 일치 31/31 · 약사 화면 PG(key) 일치 31/31
- 3회차 티켓 응답 31건 · data-api(/tickets-created, key) 일치 31/31 · 약사 화면 PG(key) 일치 31/31


# 장애 · 멱등 · 첫 호출/캐시 (6교시 sum6m.py)

# 6교시 외부 장애 · DLQ · 멱등 실저장 대조 + 첫 호출 / 캐시 (2026-11-06)

- 확인자: 문태웅(리드, CC 6교시 탭) · VM 커밋 `` (전 ``) · **팀 VM 연습 모드**(Slack · Jira 안 감) → 끝나고 실제 모드 복귀
- 시각(VM UTC):  · 단계 exit: 
- request_id 정책: 단계마다 `ops --reset` + `/cache-clear` 뒤 새 ID `d81-6m-062938-<칸>` — 멱등 시험(WF-09)만 같은 ID 2번. 캐시 · 중복 재사용은 신규 업무 시험으로 안 셈

## 배포 직후 콜드 첫 호출 (판정 안 셈)

- 배포(n8n 재시작 · 색인) 끝난 바로 뒤 새 ID 1번: **?** (기준 8초)

## #68 고친 뒤 — T-47 어르신 '약국 몇 시까지 해요?' 1회 (13:36 #59 시험의 3/3 실패 기록은 `runs/pr59-66-vm-20261106.md` 그대로)

| request_id | HTTP | route | reason | ticket (번호 · 담당 · 긴급도) | 걸린 시간 |
| --- | --- | --- | --- | --- | --- |
| `d81-6m-062938-t47` | 200 | 담당자 이관 | no_evidence | T-2001 · owner · normal | 1.466초 |

## WF-04 티켓 API 장애 (`fault tickets error`)

| request_id | HTTP | route | reason | ticket (번호 · 담당 · 긴급도) | 걸린 시간 |
| --- | --- | --- | --- | --- | --- |
| `d81-6m-062938-wf04` | 200 | 담당자 이관 | tickets_down | null | 1.777초 |
| `d81-6m-062938-wf04-recall` | 200 | 담당자 이관 | tickets_down | null | 4.669초 |

- 실저장(WF-04 1건 뒤): DLQ **1** · 알림 **1** · data-api 접수 0 · PG 0
- 약사 긴급(회수)도 장애 중에 보낸 뒤: DLQ 2 · 알림 2
  - DLQ `d81-6m-062938-wf04` · other · normal · tickets_down · attempts 1
  - DLQ `d81-6m-062938-wf04-recall` · recall · high · tickets_down · attempts 1
  - 알림 [high] tickets_down · [other] owner에게 이관
  - 알림 [high] tickets_down · [recall] pharmacist에게 이관
- 고장 해제: `['✔ fault switch: {"faq": "ok", "tickets": "ok", "prompts": "ok", "usage": "ok", "dlq": "ok", "slow_seconds": 8.0}']` → 스위치 {'faq': 'ok', 'tickets': 'ok', 'prompts': 'ok', 'usage': 'ok', 'dlq': 'ok', 'slow_seconds': 8.0}

## WF-09 같은 요청 두 번 (보통 1쌍 · 약사 긴급 1쌍)

| request_id | HTTP | route | reason | ticket (번호 · 담당 · 긴급도) | 걸린 시간 |
| --- | --- | --- | --- | --- | --- |
| `d81-6m-062938-wf09` | 200 | 담당자 이관 | no_evidence | T-2001 · owner · normal | 1.423초 |
| `d81-6m-062938-wf09` | 200 | 담당자 이관 | no_evidence | T-2001 · owner · normal · duplicate | 0.184초 |
| `d81-6m-062938-wf09h` | 200 | 담당자 이관 | urgent | T-2002 · pharmacist · high | 3.256초 |
| `d81-6m-062938-wf09h` | 200 | 담당자 이관 | urgent | T-2002 · pharmacist · high · duplicate | 0.166초 |

- `d81-6m-062938-wf09`: data-api 접수 **1** · PG **1** ([('T-2001', 'owner')])
- `d81-6m-062938-wf09h`: data-api 접수 **1** · PG **1** ([('T-2002', 'pharmacist')])
- 알림 1 (긴급 1쌍 → 1이어야 중복 알림 없음): ['[recall] pharmacist에게 이관']

## WF-10 LLM 장애 — 고친 뒤 (`llm down`, VM 위 커밋)

| request_id | HTTP | route | reason | ticket (번호 · 담당 · 긴급도) | 걸린 시간 |
| --- | --- | --- | --- | --- | --- |
| `d81-6m-062938-wf10` | 200 | 담당자 이관 | llm_down | T-2001 · owner · normal | 0.708초 |
| `d81-6m-062938-wf10-risk` | 200 | 담당자 이관 | llm_down | T-2002 · pharmacist · high | 0.765초 |
| `d81-6m-062938-wf10-recall` | 200 | 담당자 이관 | llm_down | T-2003 · pharmacist · high | 0.682초 |

- 자동 답변 수(장애 중): 0 · 500 응답: 0
- PG(장애 중 접수): [('38-wf10-risk', 'pharmacist', 'high'), ('-wf10-recall', 'pharmacist', 'high'), ('-062938-wf10', 'owner', 'normal')] · 알림 ['[senior] pharmacist에게 이관', '[recall] pharmacist에게 이관']
- 복구 `['✔ OpenAI credential: real key from infra/.env restored']` → 정상 대조 1건:

| request_id | HTTP | route | reason | ticket (번호 · 담당 · 긴급도) | 걸린 시간 |
| --- | --- | --- | --- | --- | --- |
| `d81-6m-062938-wf10-after` | 200 | 자동 답변 | - | null | 3.439초 |

- 복구 뒤 `ops`: `['DLQ: 0 (parked 0)', 'alerts: 2', '  [high] team3-handoff · urgent · Handoff · [senior] pharmacist에게 이관', '  [high] team3-handoff · urgent · Handoff · [recall] pharmacist에게 이관']`

## 쉬다 온 첫 호출 (새 ID, 캐시 없음)

| 쉰 시간 | 걸린 시간 | 응답 timings.total_ms |
| --- | --- | --- |
| 바로 | 3.388초 | 3210 |
| 30초 | 2.925초 | 2793 |
| 90초 | 3.464초 | 3310 |

## bench — 첫 호출(캐시 없음) vs 캐시 응답

- (a) 새 request_id 5개 = 전부 첫 호출: 4.298초 · 3.889초 · 3.734초 · 4.098초 · 3.171초 → 중앙값 **3.89초** · 최대 4.30초 · route ['자동 답변', '자동 답변', '자동 답변', '자동 답변', '자동 답변']
- (b) 같은 request_id 5번 (`runs/bench-team3-support-20261106-063249.json`): 1번째(첫 호출) **3.95초** · 2~5번째(캐시) 0.13 · 0.13 · 0.12 · 0.16초 → 캐시 중앙값 **0.13초** · 전체 p50 0.134 · p95 3.949
  - 주의: 캐시 응답은 `timings.total_ms`를 첫 처리 값 그대로 돌려줌([3789, 3789, 3789, 3789, 3789]) → 캐시 시간은 클라이언트에서 잰 초로만 셈
## 약사 화면 PG 담당 — 새 요청 / 기존 요청 나눠서 (UPDATE 안 함)

- 새 요청(이번 request_id `d81-6m-062938-*`): 3행 · 담당별 {'owner': 1, 'pharmacist': 2} · 빈 담당 **0**
- 기존 · 남김: 81행 중 빈 담당 58 (#66 전 행 · 고정 request_id 재사용 · `ON CONFLICT DO NOTHING`, 지우거나 고치지 않음)


