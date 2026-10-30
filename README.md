# 3팀 · 창고형 약국 약사 지원 봇 (team3-support)

창고형 약국 프로그램 회사 고객지원팀가 매장 약사들의 **시스템·운영 문의**(약국 프로그램 오류 · 바코드·결제 · 재고·반품 · 냉장 보관 · 회수 절차 · 접수 건 상태)에 매뉴얼 근거로 답하고, 시스템 장애는 벤더 기술지원팀, 회수·온도 이탈·운영 판단은 그 약국 관리약사에게 넘기는 n8n 워크플로우입니다. 약 복용·병용 판단은 자동 답변하지 않습니다.

> 단위 프로젝트 80~82일차 (2026-11-05 ~ 11-09). 설계 기준은 [`00-DESIGN.md`](00-DESIGN.md), 역할별 할 일은 [`docs/HANDBOOK.md`](docs/HANDBOOK.md)와 [`specs/`](specs/).

## 접속
| 항목 | 값 |
|---|---|
| 문의 웹훅 | `POST /webhook/team3-support` (Header `X-Team-Key`) |
| 하위 웹훅 | `team3-index` · `team3-search` · `team3-handoff` |
| n8n | <80일차 확인: 샘 VM 주소 또는 `http://localhost:5678`> |

## 바로 실행
```bash
cd ~/aio-01d4-stu/Last3Mon/80 && export FLOW_WEBHOOK_KEY=<팀 키>
uv run tools/flow.py push <이 저장소>/workflows/*.json
uv run tools/flow.py call team3-index requests/empty.json            # 색인
uv run tools/flow.py test <이 저장소>/cases/team.json -v
uv run tools/flow.py test <이 저장소>/cases/common.json --webhook team3-support -v
```

## 필요한 Credential (값은 n8n에만)
| 이름 | 용도 |
|---|---|
| `OpenAI (.env)` (`openAiCourse0001`) | gpt-4.1-mini · text-embedding-3-large |
| `team3WebhookKey` | 팀 웹훅 Header Auth |
| `dataApiKey` | 데이터 API `X-Api-Key` (키트 확인) |

## 폴더
```
00-DESIGN.md   설계 기준(계약·구조·데이터·시나리오·역할)
specs/         역할별 명세 5개 (끝에 코덱스 요청문)
workflows/     n8n JSON 5개   knowledge/  매뉴얼 8개   data/  사용자·접수 건
cases/         공통 14 · 팀 6   requests/  시연·bench 요청   runs/  시험 보고서
docs/          TOPIC · TEAM-CHARTER · WORKFLOW-DESIGN · RAG-ARCHITECTURE · EXECUTION-RESULT · daily/
```

## 문제 해결
| 증상 | 할 일 |
|---|---|
| `call` 404 / 401 | push 했는지 · `FLOW_WEBHOOK_KEY` |
| 검색 결과 늘 빔 | n8n 재시작 뒤엔 `team3-index`를 다시 호출 (In-Memory) |
| 장애 시나리오 뒤 다른 게 실패 | `flow.py fault all ok` · `flow.py llm up` |
