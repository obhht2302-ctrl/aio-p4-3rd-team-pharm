# 팀원 안내서 · 처음 받았을 때

이 저장소는 **각자 자기 명세 md 하나를 CLI 에이전트(codex · claude)에 던지면 맡은 몫을 끝까지 만들 수 있게** 짜 두었습니다. 아래 순서대로 하면 됩니다. 레포 받기 · n8n · data-api 켜기는 [README '시작 전 준비'](../README.md#시작-전-준비-readme--모든-명세에-같은-내용)에 있습니다.

## 1. 내 명세 찾기

| 역할 | 맡은 사람 | 명세 | 만드는 것 | 별 |
| --- | --- | --- | --- | --- |
| 리드 · 통합 + 시험 · 품질 | 태웅 | [`specs/05-lead.md`](../specs/05-lead.md) · [`specs/04-test-and-qa.md`](../specs/04-test-and-qa.md) | 계약, 팩 도구, Jira · Slack, VM 배포, 제안서 · 헌장, `cases/` · `runs/`, 실행 결과서 | ★★★ |
| 오케스트레이션 (+ 화면 QA 같이) | 다영 | [`specs/01-orchestration.md`](../specs/01-orchestration.md) | `workflows/team3-support.json` (본체), 설계서 2~4절 | ★★★ |
| RAG | 영민 | [`specs/02-rag.md`](../specs/02-rag.md) | 지식 문서 검수, `team3-index` · `team3-search`, RAG 설계서 | ★★☆ |
| 연동 · 안정성 + 뒷단 | 병훈 | [`specs/03-backend.md`](../specs/03-backend.md) | `team3-handoff` · `team3-errors`, `api/` (FastAPI · DB), 설계서 5~7절 | ★★★ |
| 화면 | 해든 (직접 하고, 막히면 태웅 · 다영이 도와줌) | [`specs/06-screen.md`](../specs/06-screen.md) | `web/` 화면 3개 (Next.js), 실행 결과서 5절 화면 캡처 · QA 반영 | ★★☆ |

01 · 02 · 04는 명세가 두 벌입니다: `0N-<이름>.md` = 설계판 (뼈대 + 직접 정할 칸), `0N-<이름>-full.md` = 완전체본 (그대로 에이전트에 던지면 끝까지 감). 설계판으로 하다가 막히면 완전체본의 같은 절을 보세요.

작업 마감은 **11/5(목)** 입니다.

## 2. 하루 순서

```bash
cd ~/aio-p4-3rd-team-pharm && git switch main && git pull    # 늘 먼저
git switch -c <역할>/<내용>                                    # 예: rag/search (다영 orch · 영민 rag · 병훈 ops · 해든 web · 태웅 qa)
python3 tools/packs.py build && python3 tools/packs.py check   # 팩이 바뀌었으면
# 내 명세의 "에이전트 요청문"을 복사해 codex 또는 claude에 붙여 넣기
# 에이전트 작업이 끝나면 flow.py check, push, 단독 시험(돌릴 수 있으면 공통 시나리오) 순서로 확인하고 커밋
git add <내 파일만> && git commit -m "feat: <한 일> · common N/14"
git push -u origin <역할>/<내용>    # GitHub 레포 화면에서 'Compare & pull request'를 눌러 PR 만들기 (리드가 보고 합침)
```

- main에는 바로 push하지 않습니다. PR이 합쳐진 뒤 다음 작업은 다시 첫 줄부터 시작해 새 브랜치에서 합니다.
- 커밋 메시지 · PR 설명에 시험 결과와 공통 시나리오 통과 수를 적습니다 (샘 09 문서 3절).
- **내 파일만** 고칩니다. 남의 파일을 고쳐야 하면 그 사람에게 먼저 말합니다.
- 계약(요청 · 응답 칸, route 값, 하위 웹훅 주고받는 칸)을 바꿔야 하면 먼저 리드에게 말하고, `00-DESIGN.md`부터 고칩니다.

## 3. 처음 듣는 말

[README 용어 표](../README.md#용어) 하나에 모아 두었습니다 (계약 · 처리 방식 · `Type policy` · 가짜와 스위치 · 팩 · data-api · DLQ · `fault` …).

## 4. 막혔을 때

- 30분 막히면 팀 채널에, 1시간이면 강사에게 (헌장 4절).
- 같은 곳을 에이전트가 3번 고쳐도 안 되면 멈추고, 요청을 더 작게 나누거나 64~79일차 `reference/`에서 그 부분만 가져옵니다.
- 시나리오 기대 결과(`cases/*.json`)는 통과시키려고 바꾸지 않습니다. 틀렸다고 생각되면 태웅에게.
