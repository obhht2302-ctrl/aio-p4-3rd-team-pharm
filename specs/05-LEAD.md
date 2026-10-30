# 05 · 리드·통합 명세 — `docs/TOPIC.md` · `TEAM-CHARTER.md` · `daily/` · `README.md` · `AGENTS.md` · `data/*.json` · 병합·동결·발표

> 과제 본질 한 문장: **첫날 10:30 승인부터 월요일 13:50 제출까지 계약과 파일 경계를 지키게 하고, 다섯 사람 결과물이 한 n8n에서 돌아가게 합치는 역할.** 보통 팀장이 맡지만 10/30 기준 고정 아님.
> 규모 상한: 문서 6개(제안서·헌장·데일리 3·README) + 데이터 2개 + 하루 2번 병합. 발표·협업 10점 + 설계서 1절.

> **✏️ 이 역할에서 팀원이 정하는 것**: 헌장 규칙 문구, 회의 시각, 데일리 양식, README 구성, 역할 배정·가산 선택 안건 올리기.
> **🔒 바꾸면 안 되는 것**: 80일차 10:30 제안서 승인, 저장소 비공개+강사 초대, 필수 파일 목록, 13:50 마감·11:00 동결, tscan 0건. (전체 구분은 `../00-DESIGN.md` 0절)

## 0. 시작 전
- 읽을 것: 샘 `01-SCHEDULE-AND-TEAMS.md`, `08-SUBMISSION.md`, `09-AGENT-WORKING-RULES.md`, 템플릿 `TOPIC-PROPOSAL`·`TEAM-CHARTER`·`DAILY-LOG`, `00-DESIGN.md` 전체.

## 1. 80일차 (목) 할 일 시각표
| 시각 | 할 일 | 산출 |
|---|---|---|
| 1교시 | 샘 안내 들으며 **키트 확인 항목** 체크: 데이터 API 단위 프로젝트 판 엔드포인트(`/logs` vs `/audit`, `X-Api-Key`), `users.json`·`records.json` 칸 이름, `cases/common.json` 판정 키(`min`·`llm`), VM 접속법·n8n 주소·push 방법 | `00-DESIGN.md` "키트 확인" 항목 갱신 |
| 2교시 ~10:30 | `docs/TOPIC.md`(제안서 템플릿: 1절 한 줄, 2절 조건 5, 3절 유형 6+자동 답변 금지, 4절 데이터 표, 5절 WF-01·05·12 옮긴 예 — 전부 `00-DESIGN.md`에서 복사) → 강사 승인 → 팀 헌장(역할·파일·규칙·저장소·웹훅 `team3-support`·시연 노트북/VM) → 저장소 비공개+강사 초대, 이 폴더 내용을 루트로 push | `docs/TOPIC.md`, `docs/TEAM-CHARTER.md`, 저장소 |
| 3교시 | `data/users.json`·`records.json`을 키트 모양에 맞춤, `knowledge/`·`cases/` 담당 착수 확인, `AGENTS.md` 환경 절 채움 | 데이터 API가 우리 데이터를 읽는지 `GET /employees/김하늘`·`GET /docs`로 확인 |
| 4교시 | 설계서 1절(업무 시나리오 한 문단 + 유형 표)·2절(전체 흐름 10단계) 초안 | `docs/WORKFLOW-DESIGN.md` 1~2절 |
| 5~7교시 | 각 담당 골격 push 확인, Header Auth Credential `team3WebhookKey`·`dataApiKey` 만들기(VM n8n에 한 번, 각자 n8n에도), `flow.py doctor` ready | 공통 400·차단 통과 |
| 8교시 | 설계 리뷰 5분: 흐름도·역할·계약·옮긴 cases 확인받기, 피드백 기록 | `docs/daily/80.md` |

## 2. 81·82일차
- 매일 1교시 10분 스탠드업: 어제 숫자·오늘 목표 숫자·막힌 것 → `docs/daily/81.md`·`82.md`.
- 병합 규칙: `git pull` → 내 파일만 → `flow.py check` → `push` → 공통 시나리오 → 커밋 메시지에 통과 수("handoff DLQ · common 9/14"). 한 사람 한 파일, 계약 변경은 `00-DESIGN.md` 먼저.
- 81일차 8교시 중간 점검 숫자가 7/14 미만이면 **가산(Jira·Slack 실연동·지속형 저장소·배포 관문) 중단** 선언.
- 82일차 11:00 동결 선언 → 시험·문서만. 13:30 `tscan scan .`(키·실제 연락처 0) → 13:50 마지막 커밋. 발표 15분(샘 08 문서 3절 틀: 2 시나리오·4 흐름·3 RAG·4 시연·2 결과) + 시연은 `requests/demo-01~05.json`을 `call -v`로, 장애는 `fault → call → fault all ok` 한 줄씩. 시연 전 `doctor ready`·`fault all ok`·`llm up`.

## 3. README.md (08 문서·팀 체크리스트)
맨 위 순서: 한 줄 소개 → 접속 주소 표(웹훅 경로, VM이면 호스트) → 바로 실행(`flow.py push workflows/*.json` → `test cases/team.json`) → 필요한 Credential 표(값 없이 이름만) → 폴더 구조 → 문제 해결 3개. 배치 위치·내부 경로 서술 금지, 키 0, 스크린샷은 개인정보 가린 것.

## 4. 완료 기준
- 80일차: 승인된 TOPIC.md, 헌장, 저장소, 데이터 API가 우리 데이터 읽음, Credential 2개, 골격 통과, daily/80.
- 82일차 13:50: 필수 파일 전부(`README`, `docs/` 3 산출물+헌장+daily 3, `workflows/` 5, `cases/`, `runs/`, `knowledge/`, `data/`), `tscan` 0건, 강사가 README대로 재실행 가능.

## 5. 코덱스 요청문 (복붙 — 문서 채우기용)
```
00-DESIGN.md와 samples 템플릿 ~/aio-01d4-stu-upstream/Lecture/80-82-Project/student/templates/TOPIC-PROPOSAL-TEMPLATE.md·TEAM-CHARTER-TEMPLATE.md를 읽고 docs/TOPIC.md와 docs/TEAM-CHARTER.md 초안을 채워 줘. 역할·이름 칸은 비워 두고(10/30 미배정), 나머지는 00-DESIGN.md 값으로. 예시 값을 그대로 남기지 말고 우리 값이 없는 칸은 "<80일차 확인>"으로 표시해.
```
