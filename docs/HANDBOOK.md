# 팀원 안내서 · 처음 받았을 때

이 저장소는 **각자 자기 명세 md 하나를 CLI 에이전트(codex · claude)에 던지면 맡은 몫을 끝까지 만들 수 있게** 짜 두었습니다. 아래 순서대로 하면 됩니다.

## 1. 내 명세 찾기

| 역할 | 맡은 사람 | 명세 | 만드는 것 | 별 |
| --- | --- | --- | --- | --- |
| 리드 · 통합 + 화면 | 태웅 | [`specs/05-lead.md`](../specs/05-lead.md) · [`specs/06-screen.md`](../specs/06-screen.md) | 계약, 팩 도구, Jira · Slack, VM 배포, 제안서 · 헌장, `web/` 화면 3개 | ★★★ |
| 오케스트레이션 (+ 화면 QA 같이) | 다영 | [`specs/01-orchestration.md`](../specs/01-orchestration.md) | `workflows/team3-support.json` (본체), 설계서 2~4절 | ★★★ |
| RAG | 영민 | [`specs/02-rag.md`](../specs/02-rag.md) | 지식 문서 검수, `team3-index` · `team3-search`, RAG 설계서 | ★★☆ |
| 연동 · 안정성 + 뒷단 | 병훈 | [`specs/03-backend.md`](../specs/03-backend.md) | `team3-handoff` · `team3-errors`, `api/` (FastAPI · DB), 설계서 5~7절 | ★★★ |
| 시험 · 품질 + 화면 QA | 해든 (직접 하고, 막히면 태웅 · 다영이 도와줌) | [`specs/04-test-and-qa.md`](../specs/04-test-and-qa.md) | `cases/` · `runs/`, 실행 결과서, 화면 써 보고 고칠 점 내기 | ★★☆ |

01 · 02 · 04는 명세가 두 벌입니다: `0N-<이름>.md` = 설계판 (뼈대 + 직접 정할 칸), `0N-<이름>-full.md` = 완전체본 (그대로 에이전트에 던지면 끝까지 감). 설계판으로 하다가 막히면 완전체본의 같은 절을 보세요.

작업 마감은 **11/5(목)** 입니다. 수업이 시작되는 11/5 1교시에 샘 80일차 키트를 보고 "키트 확인" 표시가 붙은 곳만 맞춥니다.

## 2. 하루 순서

```bash
git pull                                   # 늘 먼저
python3 tools/packs.py build && python3 tools/packs.py check   # 팩이 바뀌었으면
# 내 명세의 "에이전트 요청문"을 복사해 codex 또는 claude에 붙여 넣기
# 에이전트가 끝나면: flow.py check → push → 공통 시나리오 → 커밋
git add <내 파일만> && git commit -m "feat: <한 일> · common N/14"
git push
```

- 커밋 메시지에 공통 시나리오 통과 수를 적습니다 (샘 09 문서 3절).
- **내 파일만** 고칩니다. 남의 파일을 고쳐야 하면 그 사람에게 먼저 말합니다.
- 계약(요청 · 응답 칸, route 값, 하위 웹훅 주고받는 칸)을 바꿔야 하면 리드에게 → `00-DESIGN.md`부터 고칩니다.

## 3. 처음 듣는 말

| 말 | 뜻 |
| --- | --- |
| 팩 (pack) | 기능 하나를 켜고 끄는 **파일 묶음** (문서 + 처리 규칙 한 줄 + 시나리오). 사람의 일을 나누는 말이 아님 |
| 처리 방식 4개 | 자동 답변 · 근거 + 이관 · 이관만 · 접수 조회. 본체는 유형 이름이 아니라 이 4개로 갈라짐 |
| `Type policy` | 유형마다 처리 방식 · 넘길 사람 · 위험 신호를 적은 표. 본체 워크플로우의 Code 노드 하나 (원본 `config/type-policy.json`) |
| 이관 | 사람에게 넘김 = 티켓 생성. 응답 `route: 담당자 이관` |
| data-api | 샘이 주는 연습용 가짜 회사 서버. 티켓 · 알림 · DLQ가 여기 기록돼야 공통 시나리오가 통과 |
| DLQ | 처리 못 한 요청을 잃지 않게 넣어 두는 대기열 |
| 키트 확인 | 샘 80일차 키트(11/5 공개 예정)를 보고 맞출 곳 |
| 가짜 (Stub · mock) | 남의 부품이 아직 없을 때 쓰는 대역. 모양은 `contracts/examples/`의 예시 그대로 |
| 스위치 | 가짜 → 진짜로 바꿔 끼우는 곳. 본체 `Support settings`의 `SEARCH` · `HANDOFF` (`stub` / `real`), 화면 `NEXT_PUBLIC_API_MODE` (`mock` / `real`) |

## 4. 막혔을 때

- 30분 막히면 팀 채널에, 1시간이면 강사에게 (헌장 4절).
- 같은 곳을 에이전트가 3번 고쳐도 안 되면 멈추고, 요청을 더 작게 나누거나 64~79일차 `reference/`에서 그 부분만 가져옵니다.
- 시나리오 기대 결과(`cases/*.json`)는 통과시키려고 바꾸지 않습니다. 틀렸다고 생각되면 해든 · 태웅에게.
