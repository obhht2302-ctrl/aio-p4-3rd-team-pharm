# 05 · 리드 · 통합 명세 — 계약 · 팩 도구 · Jira · Slack · VM 배포 · 제안서 · 헌장

- 맡은 사람: 태웅 (팀장) · 별 ★★★ · 11/3부터 시험 · 품질 · 실행 결과서도 리드가 맡음 → [`04-test-and-qa-full.md`](04-test-and-qa-full.md). 화면(`web/`)은 해든 → [`06-screen.md`](06-screen.md)
- 과제 한 문장: **계약과 파일 경계를 지키게 하고, 다섯 명 결과물을 한 n8n에서 돌게 합치고, 11/5 10:50 승인부터 11/9 14:50 제출까지 팀을 끌고 간다.**
- 산출물: 팀 헌장 · 데일리 3장 · README · 설계서 1절 · 제안서, 발표와 협업 (제안 배점 10).

| 이 역할이 정하는 것 | 바꾸면 안 되는 것 |
| --- | --- |
| 계약 변경 승인 (`00-DESIGN.md`부터), 팩을 켜고 끄는 결정 (관문), 병합 순서, 발표 구성, 헌장 문구 | 샘 일정 (10:50 승인 · 14:00 1차 점검 · 11/6 8교시 동결 · 11/9 14:50 제출), 저장소 비공개 + 강사 초대, VM 배포는 팀장만 · 기본 브랜치에서, 키 · VM 주소 · 비밀번호를 저장소에 쓰지 않기, `tscan` 0건 |

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

# 4) 팀 설정 한 번에 — infra/.env 만들기, n8n Credential 등록, data-api 켜기 (켜져 있던 샘 data-api는 스크립트가 멈춤)
cd ~/aio-p4-3rd-team-pharm && bash tools/setup.sh
#    처음 실행하면 infra/.env 파일만 만들고 멈춰요. 그 파일 맨 위 TEAM3_KEY= 뒤에 디코로 받은 팀 키를 붙여 넣고,
#    같은 명령을 한 번 더 실행하면 돼요. GPT 키는 수업 때 각자 받은 키(OpenAI (.env))를 그대로 써요.
#    infra/.env는 git에 올라가지 않아요. 키는 이 파일에만 두고 레포나 문서에는 쓰지 마세요.

# 5) 확인 — n8n 화면의 Credentials에 team3WebhookKey · team3ApiKey가 보이고, 아래 명령에서 우리 문서 10개가 나오면 끝
curl -s localhost:8800/docs | head -c 300

# 6) flow.py는 샘 키트 폴더에서 실행하고, 파일은 레포 경로로 넘김
cd ~/aio-01d4-stu/Last3Mon/77 && uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-support.json

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

처음 보는 말은 [README 용어 표](../README.md#용어)에 있어요. 공통 시나리오 번호 뜻 (`cases/common.json`, 자세히는 `00-DESIGN.md` 7절): WF-01 문서로 답 · WF-02/02b 정보 부족 → 보완 질문, 3번째면 이관 · WF-03 문서에 없는 일 → 이관 · WF-04 티켓 API 장애 → DLQ · 알림 · WF-05 권한 밖 문서 (약국장 전용) · WF-06 남의 접수 건 · WF-07 연락처 가림 · WF-08 주입 공격 차단 · WF-09 같은 요청 두 번 → 티켓 1건 · WF-10 LLM 멈춤 · WF-11 접수 조회 지연 · WF-12 회수 긴급 + 접수 조회 · WF-13 잘못된 입력 → 400.

### 혼자 끝까지 확인하는 법

```bash
cd ~/aio-p4-3rd-team-pharm && python3 tools/packs.py check && python3 tools/packs.py selftest   # 팩 · 계약 예시 · 공통 해시
cd ~/aio-01d4-stu/Last3Mon/77 && uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-ticket.json && uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-alert.json
```
- 시험 · 품질은 [`04-test-and-qa-full.md`](04-test-and-qa-full.md) 그대로. 화면은 해든 몫 ([`06-screen.md`](06-screen.md)), 리드는 다영과 화면 QA를 하고 해든 PR을 합침. VM 배포는 4절 (11/5 키트 확인 뒤).

### 가짜 먼저, 준비되면 바꿔 끼우기

계약이 먼저 고정돼 있어서 오늘부터 바로 시작합니다. 남의 부품이 없으면 `contracts/examples/`의 예시를 그대로 쓰는 가짜로 대신하고, 진짜가 준비되면 스위치 한 곳만 바꿉니다. 완료 목표는 11/5(목) 하나입니다.

| 바로 할 수 있는 것 | 남의 것이 필요한 것 | 그동안 쓰는 가짜 (`contracts/examples/`) | 바꿔 끼우는 법 |
| --- | --- | --- | --- |
| 시나리오 · 기대값 검토 · 시험 스크립트 · 결과서 틀 (04), Jira · Slack 틀 고치기, 팩 도구, VM 계획, 제안서 · 헌장 | 다영 본체 골격 (공통 첫 실행), 모두의 워크플로우 (병합 · VM 배포) | 가짜 본체 `team3-support-stub` (결과서엔 안 씀) | 공통 실행은 골격이 올라오면, 병합은 단독 시험이 통과한 파일부터 |
| ⏳ **진짜 부품이 붙어야 할 수 있는 것** | VM 첫 배포 (11/5 키트 확인 뒤), 전체 회귀. | — (가짜로는 못 함) | 연결 뒤 진짜로 잼 |

- 읽을 것: 샘 `01-SCHEDULE-AND-TEAMS.md` · `02-ENVIRONMENT-AND-SERVICES.md` · `08-SUBMISSION.md` · `09-AGENT-WORKING-RULES.md` · `11-TOPIC-GUIDE.md`, `00-DESIGN.md` 전체.

## 1. 팩 도구 · 계약 지키기

- 원본 = `packs/`, 결과 = `knowledge/` · `data/` · `cases/team.json` · `config/`. 누가 결과 폴더를 직접 고쳤으면 원본으로 옮기라고 말합니다.
- `python3 tools/packs.py check`가 실패한 커밋은 받지 않습니다. 팩 조합이 바뀌면 `python3 tools/packs.py selftest`로 7개 조합을 다시 봅니다.
- `cases/common.json`은 11/5 14:00 1차 점검 뒤로 바꾸지 않습니다. 그 전에 바꿨으면 `python3 tools/packs.py lock` (리드만).
- 어르신 단계 스위치: `packs/senior/pack.json`의 `"level"` 한 줄 (`patient_direct` · `pharmacist_approval` · `handoff_only`) → `build` → `check` → 다영 본체에 push.
- 팩 하나 끄기 (관문): `packs/active.json`에서 한 줄 지움 → build → check → push · 재색인 → 공통 회귀 → 영민에게 RAG 숫자 다시 재기. **처음 끌 때 걸린 시간을 재서** `00-DESIGN.md` 5절의 "예상 30분"을 바꿉니다.

## 2. Jira · Slack (`workflows/team3-ticket.json` · `team3-alert.json`)

지금 JSON은 10/27 틀 그대로입니다 (주제 무관, `id` 고정: `team3Ticket00001` · `team3Alert000001`, Credential `jiraAio3Cloud001` · `slackAio3Bot0001`). 고칠 것:

| 할 일 | 왜 |
| --- | --- |
| "실제 실패 → 연습용 `POST /tickets` · `/alerts`" 갈래를 **덧붙임 전용**으로 바꿈: data-api 기록은 `team3-handoff`가 먼저 했으므로 여기서 다시 쓰지 않고 `{ok, mode, error}`만 돌려줌 | 그대로 두면 Slack이 실패할 때 data-api 알림이 2건이 돼 WF-04 (`알림 1건`)가 깨짐. `00-DESIGN.md` 3.4절 "기록은 data-api에 먼저" |
| `설정` 노드의 `mode` 기본값 `real` → 호출하는 쪽(`team3-handoff`의 `Handoff settings`)이 넘긴 값만 따름 | 실제/연습 스위치를 한 곳으로 |
| Jira는 장애 티켓만: `team3-handoff`의 `tickets_down`, `team3-errors`의 `unexpected` | 약사 이관 티켓은 우리 화면 (조합 C) |
| Slack 메시지에 연락처 · 약 이름 + 손님 정보를 넣지 않음 | 개인정보 · 건강 정보 |
| 노드 이름을 영어로 맞출지 결정 (지금 한국어) | 설계서 노드 이름 = JSON 이름이면 둘 다 됨 |

- 11/5 전: Slack 봇이 `#support-alerts`에 들어 있는지 확인. VM의 Jira Credential은 팀플용으로 만든 계정 토큰을 그대로 씁니다.
- 키 · 토큰은 n8n Credential에만. JSON · 문서 · 캡처에 0. 공공데이터 API 키(회수 Service05 · e약은요 · 허가정보 Service08 · DUR 2종, 11/2 승인)도 개인 키라 저장소 · VM에 쓰지 않습니다 — 필요한 사람(RAG 원문 대조)은 각자 신청.

## 3. 저장소 · 병합

- 저장소: GitHub `twlaude/aio-p4-3rd-team-pharm` (비공개, 팀원 collaborator). 강사 초대는 11/5 저장소 위치를 샘에게 물은 뒤 (덱은 과정 GitLab을 예로 듦, 키트 확인).
- 병합 규칙 (헌장 4절): 각자 `역할/내용` 브랜치에서 PR을 올리면 리드가 diff를 보고 합칩니다 (그 사람 파일만 바뀌었는지, PR 설명에 `flow.py check` · 단독 시험 결과가 있는지). 합친 뒤에는 main에서 `git pull`하고 공통 시나리오를 돌립니다. 깨뜨린 사람이 고칩니다.
- GitHub 무료 비공개 레포라 main 보호 규칙은 걸 수 없습니다. 약속으로 지키고, main에 바로 올라온 커밋이 보이면 그 사람에게 알립니다.
- 계약을 바꿔야 하면 `00-DESIGN.md`를 먼저 고치고 관련 명세 담당에게 알립니다.

## 4. VM 배포 (팀장만)

| 순서 | 명령 · 할 일 |
| --- | --- |
| 1 | VM에서 기본 브랜치 `git pull` → `python3 tools/packs.py build && python3 tools/packs.py check` |
| 2 | `bash tools/setup.sh` (`infra/.env` · Credential · data-api, VM의 n8n 컨테이너 이름이 다르면 `N8N_CONTAINER=<이름>`, `.env`는 커밋 안 함) → `docker compose -f infra/compose.team3.yml up -d data-api api web` (n8n은 VM에 이미 있음, 네트워크 `day65-n8n_default` — VM 이름이 다르면 `.env`의 `N8N_NETWORK`) |
| 3 | 화면은 노트북에서 `cd web && npm run build` → `web/out/`을 VM에 복사 (VM 메모리가 작아 빌드는 VM 밖) |
| 4 | VM n8n에 Credential 만들기 (OpenAI는 샘 안내대로, `team3WebhookKey` · `dataApiKey` · Jira · Slack) |
| 5 | `flow.py push workflows/team3-*.json` → `call team3-index` → `test cases/common.json --webhook team3-support` → 통과 수를 데일리에 |

- VM 주소 · 계정 · 비밀번호는 저장소 · 문서 · 발표 자료에 쓰지 않습니다 (헌장 5절 "팀장에게 물을 것").
- VM은 인터넷에 열려 있어서 화면에 **입장 코드**를 둡니다 (강사 OpenAI 키 보호). 코드는 `.env`와 팀 채널에만.
- 77판 `flow.py push`는 n8n을 재시작합니다 → 팀원이 VM을 쓰는 중인지 보고, 끝나면 재색인.

## 5. 11/5 (목) 시각표

| 시각 | 할 일 | 산출 |
| --- | --- | --- |
| 1교시 | 샘 안내 들으며 **키트 확인** (`00-DESIGN.md` 9절 8개) → 다른 곳은 그 자리에서 `00-DESIGN.md` · 명세 고침 | 커밋 "키트 맞춤" |
| 2교시 ~10:50 | `docs/TOPIC.md` 승인받기. 같이 물을 것 두 가지: ① "약 지식 문서를 식약처 공공데이터(공공누리 1 · 2유형, 출처 표기)로 만들고 손님 · 구매 · 연락처는 전부 가짜로 써도 될까요? 판단이 필요한 질문은 약사 이관으로 처리합니다." ② "어르신이 직접 묻고 근거 인용으로 답하는 단계(`patient_direct`)를 써도 될까요? 안 되면 약사 승인 뒤 전달이나 이관만으로 내립니다." → 헌장 | `docs/TOPIC.md` · `docs/TEAM-CHARTER.md` |
| 3교시 | 범위 확정 (팩 3개 그대로? 관문 기준), VM에 data-api · Credential 준비 | 데일리 메모 |
| 4교시 | 설계서 1절 (업무 시나리오 · 유형 표) | `docs/WORKFLOW-DESIGN.md` 1절 |
| 5교시 14:00 | **산출물 1차 점검** (설계서 1~4절 · 옮긴 `cases/common.json`) → 통과하면 `lock` 고정 | 점검 피드백 |
| 7교시 | VM 첫 배포 (4절) → VM에서 WF-08 · 13 | 통과 수 |
| 8교시 | 산출물 발표 ① · 관문 1 (문서 미완 팩 끔) | `docs/daily/DAY80.md` |

## 6. 11/6 · 11/9

**일정 (팀 확정)**: 11/5(목) 개발 완료 → 그날 VM 배포 · 실제 측정 (공통 시나리오 전체, 3회 반복, bench) / 11/6(금) 발표 준비 날: 실행 결과서 · 설계서 숫자 채우기와 발표 자료, 샘 기능 동결 (8교시) / 11/9(월)은 발표만 (시간이 거의 없어 문서 작업은 계획하지 않음).

- 11/6 (발표 준비 날 — 결과서 · 설계서 숫자 · 발표 자료) 12:00 중간점검 · VM 배포 1 · 관문 2 (대표 시나리오 실패 팩 끔). 16:00 VM 배포 2 + 전체 회귀. 17:00 발표 ② · **동결** · 관문 3 (공통 7개 미만이면 가산 버림).
- 11/9: **발표만** (문서 · 기능 작업 없음, 마지막 커밋은 11/6에 끝냄). 시작 전 VM `doctor` ready · `fault all ok` · `llm up`, 샘 제출 마감 14:50 전에 `tscan scan .` 0건만 확인. 발표 20분 + 질의 5분 (샘 08 문서 3절: 3 범위 · 5 흐름 · 4 RAG · 5 시연 · 3 결과).
- 매일 1교시 10분 스탠드업 → `docs/daily/DAY8N.md` (샘 템플릿, 숫자는 `runs/`에서).

## 7. 완료 기준

- 11/5 전: Jira · Slack 틀 고침 (덧붙임 전용) + `check` 통과, 04 먼저 할 것 (시나리오 검토 · `tools/run_tests.sh` · 결과서 틀), `docs/TOPIC.md` · `TEAM-CHARTER.md` 최종 초안.
- 11/5: 승인된 제안서, VM에서 WF-08 · 13 통과, 키트 맞춤 커밋, VM 실제 측정 (04 명세대로 공통 전체 · 3회 반복 · bench).
- 11/6(금) 끝까지 (샘 제출 마감은 11/9 14:50): 필수 파일 전부 (`README` · `docs/` 3 산출물 + 헌장 + 데일리 3 · `workflows/` · `cases/` · `runs/` · `knowledge/` · `data/`), `tscan` 0건, 강사가 README대로 다시 돌릴 수 있음.

## 8. 금지

- main에 검토 없이 남의 파일 병합, VM 주소 · 비밀번호 · 토큰을 저장소에, 실제 문자 · 메일 발송, 개인 업무 계정 키 사용, 서브에이전트 · `/review`.

## 9. 에이전트 요청문

```text
AGENTS.md, 00-DESIGN.md 3.4절, specs/05-lead.md 2절을 읽고 workflows/team3-ticket.json 과 team3-alert.json 을 덧붙임 전용으로 고쳐 줘.
data-api(/tickets, /alerts)를 다시 쓰는 연습용 갈래를 없애고, 실패하면 {ok:false, mode, error}만 돌려주게. mode 기본값은 호출하는 쪽 값만 따르게.
id(team3Ticket00001 · team3Alert000001)와 Credential id 는 그대로. flow.py check 오류 0 까지.
```

```text
AGENTS.md, specs/05-lead.md, 샘 templates/TOPIC-PROPOSAL-TEMPLATE.md · TEAM-CHARTER-TEMPLATE.md 를 읽고 docs/TOPIC.md · docs/TEAM-CHARTER.md 를 00-DESIGN.md 값으로 다시 맞춰 줘. 승인 메모 칸은 비워 둬.
```
