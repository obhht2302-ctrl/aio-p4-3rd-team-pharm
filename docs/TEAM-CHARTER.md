# 팀 헌장 · 3팀

> 80일차 2교시에 확정합니다 (샘 `templates/TEAM-CHARTER-TEMPLATE.md`). 바뀌면 6절에 날짜와 까닭을 적습니다.

## 1. 팀

| 이름 | 역할 (주 담당) | 함께 보는 역할 | 맡는 파일 |
| --- | --- | --- | --- |
| 태웅 | 팀장 (리드 · 통합) + 화면 | 연동 (Jira · Slack) | `team3-ticket.json` · `team3-alert.json`, `web/`, `infra/`, `packs/` · `tools/packs.py`, 병합 · VM 배포 |
| 다영 | 오케스트레이션 | 화면 QA | `team3-support.json` |
| 영민 | RAG | 지식 문서 | `team3-index.json` · `team3-search.json`, `packs/*/knowledge/` 검수 |
| 병훈 | 연동 · 안정성 + 뒷단 | 보안 | `team3-handoff.json` · `team3-errors.json`, `api/` |
| 해든 | 시험 · 품질 + 화면 QA | 데이터 검수 | `packs/*/cases.json` · `cases/common.json` 확인, `runs/`, `docs/EXECUTION-RESULT.md` |

## 2. 목표 (한 문장)

"회수 · 마감 · 어르신 약 질문 · 내 접수 건 네 유형의 문의에 약국 문서 근거와 함께 답하고, 돈 · 약 판단 · 긴급 건은 반드시 약사 · 약국장에게 넘긴다."

## 3. 범위

| 처리할 문의 유형 | 처리 방식 | 근거 문서 |
| --- | --- | --- |
| 회수 공지가 떴어요 | 근거 + 이관 (긴급) | `recall-first-response`, `recall-customer-guide` |
| 혼자 하는 첫 마감 | 자동 답변 (차액 · 온도 이탈은 이관) | `closing-checklist`, `closing-cash-mismatch` |
| 어르신 약 질문 | 자동 답변 + AI 고지 (판단 질문 · 위험 신호는 이관) | `senior-*` 3개 |
| 내 접수 건 확인 | 접수 조회 | `request-records-guide` |

하지 않을 것 (범위 밖): 진단 · 약 추천 · 용량 정하기, 실제 문자 · 메일 발송, 실제 약국 · 손님 데이터, 청구 전송 (월간 업무), 사진 읽기.

## 4. 규칙

- 공통 계약(요청 · 응답 칸, `route` 값, 하위 웹훅 주고받는 칸, API 모양)은 팀장 허락 없이 바꾸지 않는다. 바꾸면 `00-DESIGN.md` · `contracts/examples/`부터.
- 한 사람 = 한 파일. 남의 파일은 말하고 고친다.
- 고칠 때마다 공통 시나리오를 다시 돌리고, 커밋 메시지에 통과 수를 쓴다. 깨뜨린 사람이 고친다.
- 키 · 토큰은 n8n Credential과 `.env`에만. 커밋 전 `tscan staged`.
- 가짜 먼저, 준비되면 바꿔 끼운다 (본체 `SEARCH` · `HANDOFF`, 화면 `NEXT_PUBLIC_API_MODE`).
- 81일차 8교시 기능 동결: 그 뒤로는 시험 · 고치기 · 문서 · 발표 준비만.
- VM에는 팀장만 배포한다 (기본 브랜치에서, 배포 뒤 공통 시나리오).
- 막히면 30분 안에 팀에, 1시간이면 강사에게.

## 5. 저장소 · 연락

| 항목 | 값 |
| --- | --- |
| 저장소 | GitHub `twlaude/aio-p4-3rd-team-pharm` (비공개) |
| 웹훅 경로 | `team3-support` (하위 `team3-index` · `team3-search` · `team3-handoff`) |
| 팀 VM | 팀장이 관리 (주소 · 비밀번호는 여기에 쓰지 않음, 팀장에게 물을 것) |
| 회의 시각 | 매일 1교시 처음 10분 |
| 화면 QA 의견 | 디코 또는 태웅에게 직접 |

## 6. 바뀐 것

| 날짜 | 바뀐 것 | 까닭 |
| --- | --- | --- |
| 11/2 | 기능 5개 → 3개로 시작 (품절 · 금액은 정의만) | 팀 투표, 팀원 부담 |
| 11/2 | 화면(`web/`)은 리드, 해든은 시험 · 품질 + 화면 QA | 필수 WF가 밀리지 않게 |
