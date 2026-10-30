# 04 · 시험·품질 명세 — `cases/common.json` · `cases/team.json` · `requests/` · `runs/` · `docs/EXECUTION-RESULT.md`

> 과제 본질 한 문장: **샘 공통 14개를 우리 질문으로 옮긴 파일과 팀 시나리오 6개로 매일 회귀를 돌리고, 결과 보고서 숫자로만 실행 결과서를 쓰는 역할.** 초안은 이 폴더 `cases/`에 있음(판정은 샘 03 문서 4절 그대로, 질문만 우리 것). 80일차 8교시 설계 리뷰에서 확인받은 뒤 **고정**.
> 규모 상한: 공통 14(+보조 확인 케이스 3) · 팀 6 · 시연 요청 5 · bench 1. 결과서 25점이 산출물. 숫자는 `runs/*.json`에서만.

> **✏️ 이 역할에서 팀원이 정하는 것**: 공통 14개 **질문 문장**(80일차 리뷰 전까지), 팀 시나리오 6개 내용, 시연 요청 5개, 결과서 실패 사례로 뭘 고를지.
> **🔒 바꾸면 안 되는 것**: 공통 14개 ID·판정·`before/after`, 기대 결과를 결과에 맞춰 고치지 않기, 숫자는 runs/에서만, 반복 3회·bench -n 5 상한. (전체 구분은 `../00-DESIGN.md` 0절)

## 0. 시작 전
- 읽을 것: 샘 `07-TESTING-GUIDE.md`, `templates/EXECUTION-RESULT-TEMPLATE.md`, `03-SCENARIOS-AND-DATA.md` 4·5절, `Last3Mon/72/cases/`·`73/cases/`(파일 모양), 키트 `Last3Mon/80/cases/common.json`(기본 주제 판 — 판정 칸을 우리 파일과 대조).
- 초안 점검(키트 확인): `cases/common.json` WF-07의 `security.masked ≥ 1` 판정 키(`min`)가 키트 flow.py에 있는지. 없으면 `-v` 출력으로 확인하고 결과서에 수동 확인이라고 적음. WF-10의 `before: [{"llm": "down"}]` 문법이 키트와 같은지.

## 1. 할 일 순서
1. **80일차 3교시**: `cases/common.json` 질문 14개를 팀과 읽고 확정(ID·판정 그대로). `cases/team.json` T-01~T-06 기대를 **먼저** 쓰고 고정. `requests/demo-*.json` 5개 확인.
2. **80일차 골격 직후**: 공통 한 번 → 출발점 통과 수 기록(`runs/`, 데일리에 숫자).
3. **기능 붙을 때마다**(81일차): 그 기능 시나리오 + 공통 전부. 깨진 건 깨뜨린 사람에게 `runs/` 파일 경로로.
4. **81일차 8교시 중간 점검**: 공통+장애 통과 수를 숫자로(절반 미만이면 82일차 가산 중단 — 리드에게).
5. **82일차 2교시**(동결 뒤): 공통+팀 전부 `--repeat 3`, `bench team3-support requests/wf01.json -n 5`(강사 키 공유 → 상한), `flow.py ops` 캡처. 흔들린 케이스는 원인(LLM 판단·시간 초과·외부 지연) 기록.
6. **82일차 3교시**: 결과서 1~4절 채움, 실패 사례 2건+(일부러 깨고 고친 것 포함: 예 "검색 뒤 권한 필터 → 검색 전으로", "key 없는 POST → 티켓 2개 → key 추가").

## 2. 장애 연습 순서 (하나씩, 끝나면 반드시 원복)
```bash
cd ~/aio-01d4-stu/Last3Mon/80 && export FLOW_WEBHOOK_KEY=<팀 키>
uv run tools/flow.py fault all ok && uv run tools/flow.py llm up
uv run tools/flow.py test <팀레포>/cases/common.json --webhook team3-support -v          # 공통 한 번
uv run tools/flow.py test <팀레포>/cases/common.json --webhook team3-support --repeat 3  # 동결 뒤
uv run tools/flow.py test <팀레포>/cases/team.json -v
uv run tools/flow.py bench team3-support <팀레포>/requests/wf01.json -n 5
uv run tools/flow.py ops
uv run tools/flow.py fault all ok; uv run tools/flow.py llm up                               # 다른 팀원과 같은 n8n(VM)이면 특히
```
- 시나리오 파일의 `before/after`가 고장을 켜고 끄지만, 중단되면 손으로 원복. VM 공용이면 장애 연습 시간을 팀에 알리고 한다.

## 3. 결과서 숫자 (07 문서 4절)
| 칸 | 어디서 |
|---|---|
| 전체 · 성공/실패 | `runs/*.json` 통과 수(공통 14 + 팀 6) |
| 자동 답변 / 담당자 이관 | 응답 `route` 세기 |
| p50 · p95 | `bench` |
| 예외 처리 성공률 | WF-04·09·10·11·13 + T-05·06 중 기대대로 처리된 비율 |
| 근거 없는 답변 | `자동 답변`인데 `sources` 비었거나 verifier 실패 → 0이어야 |
| 권한 위반 | `mgr-` 문서·남의 건이 답에 나온 수 → 0 |
| 요청당 LLM 호출 | 실행 기록 `llm_calls` 또는 `agents` 길이 |

## 4. 완료 기준
- 80일차: cases 2개 확정·리뷰 통과, 출발점 수 기록. 81일차: 중간 점검 숫자. 82일차: `runs/` 최종 보고서(반복 3·bench) + 결과서 1~5절 + 6절 체크리스트 15개(KSM-REQ 6절 그대로 붙임).
- 결과서 숫자마다 `runs/<파일>` 이름이 붙어 있음. 기억·예상으로 채운 칸 0.

## 5. 금지
- 테스트 통과용으로 `cases/*.json` 기대 바꾸기(틀렸다고 생각되면 리드→강사), 결과에 맞춰 팀 시나리오 기대 수정, 숫자 반올림·추정, 장애 켜 두고 퇴근.

## 6. 코덱스 요청문 (복붙 — 이 역할은 파일 점검·보고서 정리에 씀)
```
specs/04-TESTING.md와 샘 07-TESTING-GUIDE.md를 읽고 cases/common.json·team.json이 샘 03 문서 4절의 ID·판정과 어긋나는 곳이 있는지 표로 짚어 줘(질문은 우리 것이어야 하고 판정 칸은 바꾸면 안 됨). 키트 Last3Mon/80/cases/common.json과 판정 키를 대조해 줘.
그다음 runs/ 보고서 JSON들을 읽어 docs/EXECUTION-RESULT.md 1절 표(시나리오·입력·기대·실제·노드·시간·3회 판정·보고서 파일)와 3절 숫자를 채워 줘. 보고서에 없는 숫자는 빈칸으로 두고 "없음"이라고 표시해.
```
