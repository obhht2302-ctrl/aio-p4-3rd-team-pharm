# 필수 3종 문서 최종 대조 기록 (11/9)

- **무엇을**: 강사 11/9 '필수 3종 문서 마무리 체크리스트'(1~4절, 항목 51개)를 [워크플로우 설계서](../WORKFLOW-DESIGN.md) · [RAG 설계서](../RAG-ARCHITECTURE.md) · [실행 결과서](../EXECUTION-RESULT.md), `workflows/*.json`의 실제 값, `runs/` 원본, 팀 VM(읽기만: `git log` · `docker ps` · `n8n list:workflow`)과 한 줄씩 맞춰 봤습니다. 근거 파일을 실제로 연 항목만 ✅로 적었습니다.
- **기준 커밋**: main = 팀 VM `4eebd3c`(VM `git log`, 11/9 11:1x 조회) · 워크플로우 마지막 변경 `383c762`(머지 `0bff65d`, WF-12 근거 번호) — 그 뒤는 문서만 · 색인 `pharm_kb_v1` 38청크(`knowledge/` 마지막 `63c5f9f`) · VM n8n에 `team3-*` 워크플로우 7개.
- **대조 일시**: 2026-11-09 11:13~11:25 KST. 리드 쪽에서 근거 파일을 하나씩 열어 대조했고, 팀장이 직접 확인할 것은 5절에 모았습니다.
- **결과**: ✅ 31 · ⚠ 17 · 미실행 1 · 미구현 0 · 미확인 2. ⚠ 가운데 레포 근거로 채울 수 있는 것은 세 문서에 채웠습니다(메모 칸 '→ 채움', 목록은 5절). 상태는 채우기 전 기준입니다.

상태: `✅ 확인` · `⚠ 일부 (빠진 것)` · `미실행` · `미구현` · `미확인`.

## 1. WORKFLOW-DESIGN.md

| 항목 (원문 요약) | 상태 | 근거 | 메모 |
| --- | --- | --- | --- |
| 사용자 · 문의 유형 · 자동 답변 범위 · 이관 조건이 TOPIC · 헌장과 같음 | ✅ | 설계서 [1절](../WORKFLOW-DESIGN.md#1-업무-시나리오) 표 = [TOPIC 3절](../TOPIC.md#3-범위) 4유형 · 처리 방식 · 근거 문서, 이관 대상 = TOPIC 2절 3행 | 헌장은 사람 담당 표라 3절 '맡은 사람' 칸과 대조(같음) |
| 정상 · 보완 · 보완 초과 · 무근거 · 긴급 · 조회 · 오류 경로 | ✅ | [2절](../WORKFLOW-DESIGN.md#2-전체-흐름) · [3절](../WORKFLOW-DESIGN.md#3-워크플로우-흐름도) · [7절](../WORKFLOW-DESIGN.md#7-오류-처리) (WF-01 · 02 · 02b · 03 · 12 · 06 · 04 · 10 · 11) | |
| 흐름도에 실제 파일명 · 노드명 · 호출 관계 (현재 기준) | ⚠ 일부 (하위 워크플로우 노드 수 2칸이 JSON과 다름) | 흐름도 노드 44개 = `team3-support.json` 이름과 글자까지 같음(빠진 3개는 LLM 모델 하위 노드) · 노드 수: handoff 문서 32 / JSON 31, errors 12 / 11 | → 채움 (31 · 11) |
| Agent마다 입력 · 역할 · 출력 · 도구 · 성공/실패, LLM과 코드 구분 | ⚠ 일부 (모델 · 실패 조건 · LLM/코드 구분 없음) | [4.1](../WORKFLOW-DESIGN.md#41-역할-카드) 표 · JSON `Triage model` · `Writer model` · `Verifier model` = `gpt-4.1-mini` · temperature 0 · `Check answer` 통과 조건 `grounded` · `policy_ok` | → 채움 (4.1 아래 2줄) |
| 분기 조건 · 병렬 결합 · 루프 최대/종료 = 실제 설정 | ✅ | [4.2](../WORKFLOW-DESIGN.md#42-구조): `SCORE_MIN` 0.37 = `Support settings` · 루프 = `Type policy` `attempt>=3` → `attempt_limit` · 병렬 = `executionOrder` v1 | 4절 설정 표 |
| 연결선마다 필수/선택 · 자료형 · 변환 · 가린 실제 예시 | ✅ | [6절](../WORKFLOW-DESIGN.md#6-노드-간-페이로드-연결선마다) · `runs/trace-wf01-20261106-0959.json` (키 · 연락처 가림) | 이관 쪽은 계약 예시 `contracts/examples/handoff.json`라고 밝힘 |
| 웹/메신저 입구 · 공통 시험 경로 · 실제 업무 API 구분 | ✅ | [5절](../WORKFLOW-DESIGN.md#5-외부-연동-노드) '연습용 → 실제 운영' 칸 | |
| 외부 연동별 인증 · timeout · 재시도 · 실패 후 처리 | ⚠ 일부 (본체 HTTP 5개 timeout 값 없음) | 5절 · JSON: `Check cache` 2초 · `Search knowledge` 6초 · `Handoff` 8초 · `Save cache` · `Log request` 2초 | → 채움 (5절 아래 1줄) |
| 티켓 · 담당 · 상태 · 알림 · DLQ 저장 시점 · 위치, 재요청 중복 방지 | ✅ | 1절 끝 문단 · 5 · 6절 `key` · 7절 중복 요청 행 · 결과서 3.2 실저장 68/68 | |
| 장애 · 예상 밖 오류 경로, Error Workflow 파일 · 설정 · 배포 · 실제 실행 구분 | ⚠ 일부 (네 단계를 나누지 않음) | 파일 `workflows/team3-errors.json` · JSON 7개 모두 `settings.errorWorkflow` = `team3Errors00001` · VM n8n 목록 `team3Errors00001` · 실제 실행 4137 (`runs/recheck-20261109.md` Error Workflow 절) | → 채움 (7절 끝) |
| 구현 안 한 복구 · 동시성 · 인증과 한계, 결과서 근거 연결 | ⚠ 일부 (설계서에 한계 모음 · 결과서 링크 없음) | 결과서 [4.2](../EXECUTION-RESULT.md#42-남은-결함--잔여-위험-동결-전-7교시-최종-회귀-기준) · 동시 15 · 30명 실패 0 (`runs/recheck-20261109.md` 끝 절) | → 채움 (맨 위 '현재 상태') |

**마지막 대조 — WF-01 한 건** (`d81-2-wf01trace-005954`, 11/6 09:59, VM `8d81022`, n8n 실행 1650 · 1651, `runs/trace-wf01-20261106-0959.json`)
- 입력 `Support webhook` (김하늘 · 마감 현금 순서) → `Check user` → `Validate input` → `Check cache` → `Injection rules` → `Triage` → `Type policy` (closing · auto) → `Route by mode` → `Search knowledge` + `Get record`(NONE → 404) → `Merge evidence` → `Build context` → `Evidence?` → `Writer` → `Verifier` → `Check answer` → `Needs handoff?` → `Build result`.
- 응답 `Send result`: route 자동 답변 · sources 1등 `closing-checklist` 2절 0.591 · 티켓 없음. 저장: `Save cache` stored (ttl 600) · `Log request` stored 1.
- 실행된 34개 노드 순서가 흐름도의 자동 답변 갈래와 같습니다. 그 뒤 워크플로우 변경(`383c762`까지)은 노드 안 코드만 바꿨고 노드 이름 집합은 같습니다(`git show 8d81022:` 대조) → 문서만 보고 따라갈 수 있습니다.

## 2. RAG-ARCHITECTURE.md

| 항목 (원문 요약) | 상태 | 근거 | 메모 |
| --- | --- | --- | --- |
| 출처 · 문서 ID · 버전 · 공개/제한 범위 · 실제 색인 대상 | ✅ | RAG [1절](../RAG-ARCHITECTURE.md#1-원본-문서) · [4절](../RAG-ARCHITECTURE.md#4-인덱스-및-메타데이터) `kb_version` | |
| 원본 수와 청크 수 구분, 예상 · 로컬 · VM 수 | ⚠ 일부 (로컬 · VM 수를 나눠 적지 않음) | 원본 10 · 로컬 `knowledge/*.md` `##` 절 38 (11/9 셈) · VM 38 (11/6 `runs/deploy1-20261106.md`) | → 채움. 11/9 VM 청크 수는 직접 안 셈 (미확인, `knowledge/` 변경 없음) |
| 전처리 · 절 구분 · 크기 · 겹침 · 빈 문서/중복 처리 · 선정 이유 | ⚠ 일부 (빈 문서 처리 없음) | [2절](../RAG-ARCHITECTURE.md#2-전처리-및-청킹) · `team3-index.json` `Make chunks`: 첫 `##` 앞은 버림 → 절 없는 문서는 청크 0 | → 채움 (2절 표 1줄) |
| 청킹 비교: 같은 원본 · 질문 · 조건, 재계산과 실검색 구분 | ✅ | 2절 (질문 12개 · top_k 같음 · 11/3) · 표 아래 문단 (절 단위 행 = 11/5 복제기 재계산) | |
| 비교표 숫자의 측정 방법 · 원본 경로 | ✅ | 머리말 `docs/rag-eval/results.json` · 2절 '다시 재는 법' · 7절 `blind_questions.json` | |
| 임베딩 모델 · 차원 · 거리 · 저장소 · 인덱스 · 실제 적용값 | ✅ | [3절](../RAG-ARCHITECTURE.md#3-임베딩) = JSON `Embeddings` `text-embedding-3-large` · `options` {} (차원 축소 없음) · In-Memory | 실제 벡터 길이는 안 셈 — 문서도 'OpenAI 문서 기준'으로 적음 |
| `top_k` · 점수 기준 · 근거, 단일 점수 한계와 안전 분기 | ✅ | 3절 `SCORE_MIN` 행 (간격 0.012 · 블라인드 겹침 · Triage가 먼저 거름) | |
| 문서/청크 ID · section · 권한 · 버전과 응답 `sources` 연결 | ✅ | 4절 메타데이터 7칸 · `Shape evidence` → 설계서 6절 `sources` | |
| 권한 확인 위치 · 검색 전 제외 · 제한 문서가 문맥 · 응답 · 로그에 노출되는지 | ✅ | 4절 검색 전 필터 · `Shape evidence` 한 번 더 · 2절 WF-05 0회 · trace 1651 `Skip owner` | 로그는 직원 요청에서 owner 검색 노드가 안 돈 것까지 확인 |
| 대표 질문의 기대 근거 · 실제 결과 · 점수 · 순위, 무근거 · 권한 거절 | ✅ | [6절](../RAG-ARCHITECTURE.md#6-어르신-경계-근거-찾기와-이관-실행은-따로) · [8절](../RAG-ARCHITECTURE.md#8-검색-순위와-최종-route--블라인드-25문항을-vm에서-끝까지-115-저녁) (문서 밖 Q22~25 · SB-J5 0.282) · WF-05 | |
| 색인 명령 · 갱신 순서 · 재시작 뒤 재색인 · 실제 확인 범위 | ✅ | [5절](../RAG-ARCHITECTURE.md#5-백업--복구-및-확장) 색인 재생성 (push → 재시작 → 재색인 2.1초) | |
| 임베딩/검색 장애 · 불완전 색인 · 버전 불일치 처리 | ⚠ 일부 (검색 장애 · 버전 불일치 없음) | JSON `Search knowledge` 6초 · `onError` continueRegularOutput → 근거 0 → `No evidence` · `tools/flow.py` 고장 대상에 검색 없음 · 본체는 `kb_version`을 확인하지 않음 | → 채움 (5절 1줄: 설정만 · 실측 없음 · 버전 확인 미구현) |
| 백업 · 복원 · 롤백 · 확장: 현재 구현 · 실측 · 계획 구분 | ✅ | 5절 두 칸 | |

**마지막 대조 — `closing-checklist` 한 개**
- 원본 `packs/closing/knowledge/` → 빌드 `knowledge/closing-checklist.md` → `## 2. 문 닫은 뒤 — 돈 맞추기 …` 절이 청크 하나 (`Make chunks`: `doc` · `section` · `chunk` · `access_level` all · `kb_version` pharm_kb_v1).
- 저장 = 메모리 키 `pharm_kb_v1_all` (`mgr-` 접두가 아니라 all) → 검색 trace 1651 `Search all` → `Shape evidence` 1등 0.591.
- 응답 1650 `Send result` `sources[0]` = {`closing-checklist`, 2절, 0.591} — 원본 → 청크 → 저장 키 · 권한 → 검색 → 응답 출처가 이어집니다.

## 3. EXECUTION-RESULT.md

| 항목 (원문 요약) | 상태 | 근거 | 메모 |
| --- | --- | --- | --- |
| 첫 부분에 최신 결과 · 확인 일시 · 미해결, 과거 기록 보존 | ⚠ 일부 (11/9 값이 3.2에만 있음) | 결과서 3.1 '82 재확인' 두 행 · 3.2 | → 채움 (맨 위 '현재 상태') |
| Git 커밋 · VM 배포 소스 · 활성 워크플로우 · 색인 버전, 일부 교체 범위 | ⚠ 일부 (VM 워크플로우 목록 없음) | 3.1 커밋 칸 · 5절 · VM `n8n list:workflow` 7개 · 레포 밖 설정 = 4.2 실행기 줄 | → 채움 |
| 로컬/VM · 실제 API/Mock · 운영/격리 · 도구 · 초기화 | ✅ | 1절 머리 (VM 연습 모드 · 회차마다 `ops --reset` + 캐시) · 4.2 4xx 시뮬 | |
| 14유형 커버리지와 판정 통과/전체 따로 | ✅ | 3.1 머리 문단 (/14와 /20을 따로) | |
| 팀 · 장애 · 보안 각각 통과/실패/미실행, 조건부 판정 설명 | ✅ | 3.1 팀 /5 · 장애 /3 · 6절 보안 1칸 미체크 · PASS* 표기 없음 | `runs/security-20261106.md`는 결과서에 링크 없음 (runs/README에는 있음) |
| 시나리오별 입력 · 기대 · 실제 · 판정 · 보고서 | ✅ | [1절](../EXECUTION-RESULT.md#1-시나리오별-시험-기록) 표 | |
| 대표 정상 · 이관 · 예외의 request_id · 실행 ID · 시각 | 미확인 | [2절](../EXECUTION-RESULT.md#2-실행-로그-대표-3건-정상--예외--이관) request_id · 11/6 15:17은 있음, n8n 실행 ID 없음 | 실행 ID는 WF-01 trace 1650 · WF-11 2182 · 2187 · 검증 2122만. VM 실행 기록 조회는 이번 범위(읽기 3종) 밖 |
| route · sources · reason · 티켓과 저장 담당 · 상태 · 티켓/알림/DLQ 건수 | ✅ | 2절 · 3.2 실저장 68/68 · WF-04 DLQ 1 · 알림 1 | |
| 같은 ID 재요청 · 중복 저장/알림 방지 · 장애 해제 뒤 복귀 | ✅ | WF-09 · 3.2 장애 행 · `runs/fault-idempotency-20261106.md` | |
| 호출자 전체 시간과 n8n 노드 시간 구분, 첫 호출 · 예열 · 캐시 · 재시작 | ✅ | [3절](../EXECUTION-RESULT.md#3-결과-요약) 처리시간 3행 · 사례 4 노드별 시간 · 3.2 첫 호출 | |
| 회차별 결과 보존 · LLM 3회 · `bench -n 5`, 실패를 추리지 않음 | ✅ | 1절 보고서 3개씩 · 사례 1 56/60 남김 · bench 5번 | |
| 공식 시간 기준과 팀 timeout 구분 | ✅ | 1절 기대 `max_seconds` 8 · 6 (cases) · 사례 4 `Get record` 3초 = 팀 설정 | 팀 설정은 줄였고 기준은 그대로 |
| 실패마다 증상 · 원인 · 수정 · 재시험 · 남은 한계 | ✅ | [4절](../EXECUTION-RESULT.md#4-실패-사례-2건-이상) 사례 1~4 | |
| 화면 · n8n 캡처를 원본 실행과 연결, 예상 · 조회 · 새 실행 구분 | ⚠ 일부 (n8n 캡처 없음 · 5절 자리표시 `docs/images/…`) | `docs/images/d82-senior-owner-handoff.png` = 11/9 실제 모드 T-2006 (`runs/recheck-20261109.md`) | → 채움 (5절: n8n 캡처 없음 · trace로 대신). README 화면 3장이 어느 실행인지는 미확인 |
| 미실행 · 구현만 · 중단 · 조회만을 전체 통과로 안 씀 | ✅ | 4.2 (4xx · 429 시뮬만 · 로그 조회 실패 · 예열 미선언) | |
| 부록 과거 성적과 현재 요약 충돌 없음, 체크는 근거 있는 것만 | ⚠ 일부 (6절 체크는 11/6 대조 · 노드 수 2칸 어긋남) | [6절](../EXECUTION-RESULT.md#6-제출-전-체크리스트-원본-요구-6절) | → 채움 (6절 머리에 11/9 재대조 1줄) |

**마지막 대조 — 통과 1 · 실패 1**
- 통과 WF-01 (1절: 3.2초 · 3/3 · VM `3c9ca9b`): `runs/common-20261106-061829` · `061921` · `062012` 모두 `passed` 20/20, WF-01 3.9 · 3.2 · 2.9초 → 중앙값 3.2초 일치. 버전 `3c9ca9b`는 `runs/final-regression-20261106.md`에 있음.
- 실패 사례 1 (4절: 56/60, WF-02b · WF-03 2 · 3회차 duplicate): `runs/common-20261106-062109.json` 56/60, 떨어진 4줄 모두 `ticket.duplicate = true (expected false)` — 숫자 · 조건(초기화 없이 연속 3회)이 같습니다.

## 4. 세 문서 함께 보기

설정 값 (`workflows/*.json` 실제 값 ↔ 세 문서):

| 값 | JSON 실제 | 설계서 | RAG 설계서 | 결과서 | 일치 |
| --- | --- | --- | --- | --- | --- |
| 채팅 모델 | `gpt-4.1-mini` · temperature 0 (`Triage` · `Writer` · `Verifier model`) | 없음 | — | 없음 | ⚠ → 설계서 4.1에 채움 |
| 임베딩 · 차원 | `text-embedding-3-large` · `options` {} (`team3-index` · `team3-search`) | — | 3절 · 3072 | 6절 | ✅ |
| `top_k` | `KB settings` 기본 4 (1~10) · `fetch_k` = ×2 · 본체 요청 4 | 4.2 · 6절 4 | 3 · 4절 4 · ×2 | 6절 4 | ✅ |
| `SCORE_MIN` | 0.37 (`Support settings`) | 0.37 | 0.37 | 6절 0.37 | ✅ |
| attempt 한도 | `attempt>=3` → `handoff_only` · `attempt_limit` (`Type policy`) | 4.2 최대 3회 | — | WF-02b | ✅ |
| 본체 timeout | `Check user` 3 · `Check cache` 2 · `Search knowledge` 6 · `Get record` 3 · `Handoff` 8 · `Save cache` 2 · `Log request` 2초, 재시도 없음 | 3초 2개만 | — | 사례 4 (4 → 3초) | ⚠ → 설계서 5절에 채움 |
| 하위 timeout · 재시도 | `Create ticket` 2초 + `Retry ticket` 2회 · 500ms · 화면 · DLQ · 알림 2초 · Jira 4초 재시도 없음 · Slack 3회 · 1초 | 5절 같음 | — | 2절 WF-04 | ✅ |

| 함께 맞출 항목 | 상태 | 근거 · 메모 |
| --- | --- | --- |
| 범위 · 역할 | ⚠ 일부 (발표 자료는 레포 밖) | TOPIC 3절 = 설계서 1절 · 헌장 역할 = 설계서 3절 맡은 사람. 발표 자료 대조는 미확인 |
| 설정 | ⚠ 일부 | 위 표 — 채팅 모델 · 본체 timeout 채움 |
| 흐름 · 근거 | ✅ | 설계서 7절 '확인한 시나리오' WF ID = 결과서 1절 같은 ID |
| 버전 · 숫자 | ✅ | main = VM `4eebd3c` · 원본 10 · 청크 38 · 공통 20 · 팀 24 · 세 갈래 7 · 최신 결과가 결과서 3.1 · 3.2 = `runs/README.md` 1절 |
| 한계 | ⚠ 일부 (설계서 · RAG에 결과서 한계 연결 없음 · 발표 미확인) | → 세 문서 맨 위 '현재 상태'에 같은 한계 + 결과서 4.2 |
| 담당자 교차 검토 · 팀장 확인 | 미확인 | 교차 검토 기록 없음 — 팀장 직접 |
| 링크 · 이미지 · 보고서가 main 안에서 열림 | ✅ | 이 브랜치 링크 검사 bad 0 (머지 전, 원격 main 확인은 머지 뒤) |
| 키 · 비밀번호 · 개인정보 없음, 비밀 검사 범위 · 예외 · 시각, 최종 변경분 재확인 | ⚠ 일부 (최종 변경분 재검사 없음) | 11/9 `tscan scan` 0건 · 731파일 · `.tscanignore` (DAY82 5교시 칸) · 그 뒤 문서 PR에 tscan 재실행 기록 없음 · 결과서 6절 미체크 1칸 그대로 |
| README: 실행 방법 · 3종 문서 · 실제 결과 · 접근 인계 | ⚠ 일부 (접근 인계 없음) | README '바로 실행' · '제출 문서' · '결과 한눈에' 있음, VM · 화면 접근을 넘겨받는 방법 줄은 없음 |
| DAY82: 오늘 한 일 · 강사 피드백 · 남은 과제, 사전 준비와 당일 구분 | ✅ | [DAY82](../daily/DAY82.md) 2 · 4 · 5절 · '미리 함' 표기 | 이 체크리스트(11/9 오전 공지) 대조는 DAY82에 아직 없음 |
| 최종 commit · push · 원격 main 확인, 14:50 제출 위치 · 커밋 · 시각 기록 | 미실행 | 대조 시각엔 제출 전 — 마지막 머지 뒤 기록 |

## 5. 세 문서에 채운 것 · 팀장 확인

- **설계서**: 맨 위 '현재 상태 (11/9)' · 3절 노드 수 (handoff 31 · errors 11) · 4.1 모델과 LLM/코드 구분 · 실패 조건 · 5절 본체 timeout 1줄 · 7절 Error Workflow 네 단계.
- **RAG 설계서**: 맨 위 '현재 상태 (11/9)' (원본 10 · 로컬 38 · VM 38 따로) · 2절 빈 문서 처리 1줄 · 5절 장애 · 버전 불일치 1줄.
- **결과서**: 맨 위 '현재 상태 (11/9)' · 5절 n8n 캡처 자리표시 → 사실대로 · 6절 11/9 재대조 1줄.
- **팀장이 직접 볼 것**: ① 담당자 교차 검토 기록 ② 발표 자료의 범위 · 설정 · 한계가 세 문서와 같은지 ③ 문서 PR 뒤 `tscan scan` 한 번 더 ④ README에 VM · 화면 접근 인계 줄을 넣을지 ⑤ 14:50 제출 위치 · 커밋 · 시각 기록과 DAY82 반영 ⑥ 대표 3건의 n8n 실행 ID를 VM 실행 기록에서 찾아 넣을지.
