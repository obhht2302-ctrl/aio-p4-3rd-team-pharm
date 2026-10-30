# 3팀 단위 프로젝트 · 창고형 약국 약사 지원 봇 — 설계·명세 묶음 (10/30 CC 초안)

이 폴더가 그대로 팀 저장소 루트가 되게 만들었다. **`00-DESIGN.md`가 기준**이고 역할마다 `specs/0N-*.md` 하나를 읽고 끝의 "코덱스 요청문"을 CLI 에이전트에 붙여 넣으면 자기 몫을 처음부터 끝까지 만들 수 있게 썼다.

| 읽는 사람 | 읽을 파일 | 만드는 것 |
|---|---|---|
| 모두 | `00-DESIGN.md` 1~3절, `AGENTS.md` | — |
| 오케스트레이션 | `specs/01-ORCHESTRATION.md` | `workflows/team3-support.json`, 설계서 2~4절 |
| RAG | `specs/02-RAG.md` | `knowledge/*.md` 8개, `workflows/team3-index.json`·`team3-search.json`, RAG 설계서 |
| 연동·안정성 | `specs/03-HANDOFF.md` | `workflows/team3-handoff.json`·`team3-errors.json`, 설계서 5~7절 (Jira·Slack 가산은 태웅) |
| 시험·품질 | `specs/04-TESTING.md` | `cases/*.json` 확정·`runs/`·실행 결과서 |
| 리드·통합 | `specs/05-LEAD.md` | `docs/TOPIC.md`·헌장·daily·README·`data/*.json`, 병합·동결·발표 |

**고정과 팀 결정의 경계는 `00-DESIGN.md` 0절**에 표로 있다. 🔒는 샘 계약·평가라 못 바꾸고, ✏️는 전부 회의에서 바꿔도 된다. 이 묶음은 초안이지 지시가 아니다.

이미 들어 있는 초안: `data/users.json`(5명) · `data/records.json`(4건) · `cases/common.json`(14+3) · `cases/team.json`(6) · `requests/`(시연 5 + bench 1 + 501자). 비어 있는 폴더 `knowledge/`·`workflows/`·`docs/`는 각 역할이 채운다.

아직 모르는 것(80일차 1교시 확인): 샘 VM 구성, 단위 프로젝트 판 데이터 API의 정확한 칸 이름·`X-Api-Key`·`/logs`, 키트 `flow.py`의 판정 키. `00-DESIGN.md`에 "키트 확인"으로 표시해 뒀다.
