# 02 · RAG 명세 — `knowledge/*.md` 8개 + `workflows/team3-index.json` + `workflows/team3-search.json`

> 과제 본질 한 문장: **팜플러스 매뉴얼 8개를 쓰고, 권한별 메모리 키 2개에 색인하고, 질문을 받아 점수 붙은 근거 조각을 돌려주는 검색 모듈 + 청킹 비교 숫자.** 계약은 `../00-DESIGN.md` 3.1·4·6절.
> 규모 상한: 문서 8개(각 ## 절 3~4개, 절당 150~400자, 전체 ~2,500자/문서 이하), 워크플로우 2개(각 노드 ≤12), 비교 실험 2가지(절 단위 vs 300자+오버랩 50). RAG 설계서 30점이 이 역할의 산출물.

## 0. 시작 전
- 읽을 것: `00-DESIGN.md` 4·6절, 샘 `05-RAG-DESIGN-GUIDE.md`, `templates/RAG-ARCHITECTURE-TEMPLATE.md`, `Last3Mon/71/AGENTS.md` 5절 + `71/reference/lab01-example2-index.json`·`-search.json`, 조사 원문 `reference/bootcamp_p4_topics/약국_도메인조사_raw_1030.md`(사실 근거).
- 데이터 API 단위 프로젝트 판이 `knowledge/`를 `GET /docs`·`GET /docs/<name>`으로 내어 준다(키트 확인). 안 되면 index 워크플로우 `Read knowledge` Code 노드에 문서 텍스트를 넣는 대체 경로를 두되, 원본은 항상 `knowledge/*.md`.

## 1. 지식 문서 8개 작성 규칙
- 파일명·절 제목은 `00-DESIGN.md` 6절 표 **그대로**(시나리오 `sources`가 이 이름을 본다). 첫 줄 `# <한국어 제목>`, 그 다음 `## 1. 절 제목` … 글머리표 3~6개. 72일차 `data-api/data/docs/*.md` 모양.
- 사실은 조사 원문에서만, **숫자·명칭은 가짜로 바꿔 쓴다**(프로그램 '팜플러스', 제품 OTC-01~06, 체인 '메가팜', 연락처 `010-0000-xxxx`). 실제 회사 매뉴얼 문장 복사 금지. 법령 숫자(냉장 1~5°C 등)는 사실대로 두고 출처를 RAG 설계서 1절에 한 줄.
- 서로 모순 금지(예: 반품 가능 조건이 두 문서에서 다르면 안 됨). `scope-and-escalation.md` 2절은 "복용·병용·용량·효능 비교 질문엔 답하지 않고 약사 판단 영역임을 안내한다"를 명시 — T-01·T-04가 이 절을 근거로 쓴다.
- `mgr-loss-disposal.md`만 접두 `mgr-` → `access_level: manager`. 비상연락망 번호는 `010-0000-9xxx`(T-06이 이 패턴이 새지 않는지 봄).
- 각 문서 끝에 `## 관련 문의 예` 절 1개(질문 2~3개)를 더해도 됨 — 검색 hit 올라감. 단 절 수 상한 5.

## 2. `team3-index.json` 노드 표
| 노드 이름 | 하는 일 |
|---|---|
| `Index webhook` (path `team3-index`, Header Auth) | `{kb_version?}` |
| `List docs` → `One item per doc` → `Get doc` | `/docs` → split → `/docs/<name>` |
| `Make chunks` (code) | `## ` 기준 절 단위 청크, 앞에 `제목 › 절제목` 붙임, 메타 `{doc, title, section, chunk, access_level(mgr- 접두면 manager), kb_version}` |
| `By access` (switch) → `Store all` / `Store manager` (vectorStoreInMemory insert, memoryKey `pharm_kb_v1_all` / `pharm_kb_v1_manager`, clearStore true) + `Embeddings`(text-embedding-3-large) + `Chunk loader`(metadata 위 6개) | 권한별 파티션 |
| `Index summary` (code) → `Send index result` | `{docs, indexed_chunks, seconds, kb_version, per_doc[]}` |
- `kb_version` 바꾸면 메모리 키 접미가 바뀜(`pharm_kb_v2_*`) → 검색 쪽 설정 노드 `KB settings`의 값만 바꾸면 전환(롤백은 되돌리기). 색인 시간은 Code에서 `Date.now()` 차이로 잼(설계서 5절).

## 3. `team3-search.json` 노드 표
| 노드 이름 | 하는 일 |
|---|---|
| `Search webhook` (path `team3-search`) | `{query, access_levels, top_k=4, type?}` |
| `KB settings` (set) | `kb_version`, `SCORE_MIN` 참고값(검색은 거르지 않고 돌려줌; 거르기는 support가) |
| `Need manager?` (if) | `access_levels`에 manager 포함 여부 |
| `Search all` / `Search manager` (vectorStoreInMemory load, topK, includeDocumentMetadata, alwaysOutputData) + 같은 `Embeddings` | 검색 전 권한 필터 = 키 선택 |
| `Merge hits` → `Shape evidence` (code) | 두 결과 합쳐 점수 내림차순, 같은 `doc+section` 중복 제거, `{doc,title,section,text,score,access_level}` top_k개, `search_ms` |
| `Send evidence` | `{evidence[], kb_version, search_ms}` 200. 저장소가 비면 `evidence: []`(500 아님) |

## 4. 비교 실험 (RAG 설계서 2~3절 숫자)
- 질문 세트 12개(공통 WF-01·05·12 + 팀 T-01~04 + 문서별 1개) — `docs/rag-eval/questions.json`에 기대 문서 적고 **먼저** 확정.
- 청킹 A = 절 단위(기본) vs B = 300자+오버랩 50(Code 분기 `CHUNK_MODE`). 각각 색인 → 같은 12개 질문 → hit@1·hit@3, 청크 수·길이 최소/중앙/최대(샘 키트 `scripts/chunk_stats.py` 있으면 사용), 색인 시간·토큰 어림.
- top_k 3 vs 4, `SCORE_MIN` 후보: 정상 질문 최고점 분포 vs 범위 밖 질문(커피머신·간판 조명) 최고점 분포 사이 값으로 정해 `00-DESIGN.md` 3.3절·support Code 상수에 반영(오케스트레이션 담당에게 알림).
- 결과를 `docs/RAG-ARCHITECTURE.md` 2·3절 표에 잰 값으로. 임베딩 차원 3072, 거리 = In-Memory 코사인 점수(클수록 가까움) 한 줄 근거.

## 5. 완료 기준
- `flow.py call team3-index` → `indexed_chunks ≥ 24`, `per_doc` 8개, manager 청크는 manager 키에만.
- `flow.py call team3-search` `{query:"바코드 미등록", access_levels:["all"]}` → evidence[0].doc = `barcode-payment`; `{query:"폐기 승인 기준", access_levels:["all"]}` → `mgr-loss-disposal` 없음, `["all","manager"]`면 있음.
- 12개 질문 hit@3 ≥ 10/12(미달이면 문서 절 제목·관련 문의 예 보강 후 재측정, 기록 남김).
- RAG 설계서 1~5절 채움(원본 문서 표 잰 값·청킹 비교·임베딩·메모리 키·백업/복구/확장 어림).

## 6. 금지
- 실제 매뉴얼 복사, 문서 간 모순, 검색 뒤 권한 거르기(검색 전 키 선택이어야 함), support 쪽 분기 로직을 search에 넣기, 서브에이전트·`/review` 호출.

## 7. 코덱스 요청문 (복붙)
```
00-DESIGN.md 4·6절과 specs/02-RAG.md를 읽고 ① knowledge/ 8개 문서를 1절 규칙대로 써 줘(사실은 reference/bootcamp_p4_topics/약국_도메인조사_raw_1030.md에서만, 이름·숫자는 가짜로). 
② 그다음 workflows/team3-index.json, team3-search.json을 2·3절 노드 표대로, 노드는 ~/aio-01d4-stu/Last3Mon/71/AGENTS.md 5절 검증된 것만, 출발점은 71/reference/lab01-example2-index.json·-search.json.
먼저 8개 문서의 절 제목 목록과 두 워크플로우의 노드 순서를 보여 주고 승인받은 뒤 만들어. flow.py check 통과 후 push·call 명령을 알려 줘. 완료 기준은 5절.
```
