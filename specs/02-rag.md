# 02 · RAG 명세 (설계판) — 지식 문서 검수 + `team3-index` · `team3-search` + RAG 설계서

> 설계판으로 직접 해 봐도 되고, 완전체본을 그대로 에이전트에 던져도 돼요. 설계판으로 하다가 막히면 완전체본의 같은 절을 보세요. (완전체본: [`02-rag-full.md`](02-rag-full.md))

- 맡은 사람: 영민 · 마감: 11/5(목) · 별 ★★☆
- 과제 한 문장: **지식 문서 10개를 검수하고, 권한별로 나눠 색인하고, 질문을 받으면 점수 붙은 근거 조각을 돌려주는 검색 모듈을 만들고, 잰 숫자로 RAG 설계서를 쓴다.**
- 이 판은 **뼈대 + 설계 + 직접 정할 칸**입니다. 고정 칸(검색이 돌려주는 모양 · 권한 나누기 · 완료 기준)은 완전체본과 같고, 노드 구성 · 청킹 · 수치는 직접 정해 설계서에 적습니다.

> **처음 읽는 분께** — 이 저장소는 가상 약국의 업무 문의를 n8n 워크플로우로 답하는 3팀 프로젝트예요. 이 명세는 **RAG 담당(영민)** 몫입니다. RAG(검색 증강 생성)는 "질문과 가까운 문서 조각을 먼저 찾아서 그 조각을 근거로 답하게 하는 방식"이고, 이 역할은 그중 **문서를 조각내 저장하고(색인) 찾아 주는(검색) 부분**을 맡습니다. 답을 만드는 본체는 **다영(오케스트레이션 담당)**이 만들고, 우리 검색을 웹훅으로 부릅니다.
> 명령은 모두 **이 저장소 맨 위 폴더**에서 칩니다 (`flow.py`만 샘 실습 폴더 `~/aio-01d4-stu/Last3Mon/77`에서 — 80일차 키트가 나오면 `Last3Mon/80`). n8n은 수업 65일차에 설치한 노트북 n8n(`http://localhost:5678`), data-api(연습용 가짜 회사 서버)는 [`infra/README.md`](../infra/README.md)대로 띄웁니다.

**처음 나오는 말**

| 말 | 뜻 |
| --- | --- |
| 청크 · 청킹 | 문서를 검색하기 좋은 크기로 자른 조각 · 자르는 방법 (절 단위, 300자 단위 등). 오버랩 = 조각끼리 겹치게 남기는 글자 수 |
| 임베딩 | 글을 숫자 벡터로 바꾸는 것. 가까운 뜻이면 점수(0~1)가 높음 |
| `top_k` | 검색 결과를 몇 개까지 돌려줄지 |
| `SCORE_MIN` | 이 점수보다 낮은 조각은 근거로 안 씀 (본체가 거름) |
| hit@1 · hit@3 | 질문마다 "기대한 문서가 1등 안에 / 3등 안에 들었나"를 센 비율 |
| 메모리 키 | n8n 메모리 벡터 저장소의 이름. 권한별로 둘: 모두용 · 약국장용 |
| `access_level` · `mgr-` | 문서 권한. 파일 이름이 `mgr-`로 시작하면 약국장(`owner`)만, 나머지는 `all` |
| 노드 `type` · `typeVersion` | n8n 노드 종류와 판. 샘 실습에서 돌아간다고 확인된 값만 씀 |
| 설계판 · 완전체본 | 이 문서 = 뼈대 + 직접 정할 칸, `02-rag-full.md` = 그대로 에이전트에 던지면 끝까지 가는 판 |

| 이 역할이 정하는 것 | 바꾸면 안 되는 것 |
| --- | --- |
| 문서 문장 · 절 제목, 청킹 방식 · 오버랩 · `top_k` · `SCORE_MIN`, 질문 세트, 메모리 키 이름 · 버전 규칙, 노드 구성 | 문서 6개 이상 · 절 3개 이상, 가짜 데이터 (어르신 문서만 공공 약 정보 + 출처), **검색 전** 권한 필터, `team3-search` 응답 칸, `mgr-` = 약국장 전용, 문서 파일 이름 |

## 0. 시작 전

**가짜 먼저, 준비되면 바꿔 끼우기** — 계약이 먼저 고정돼 있어서 오늘부터 바로 시작합니다. 남의 부품이 없으면 `contracts/examples/`의 예시를 그대로 쓰는 가짜로 대신하고, 진짜가 준비되면 스위치 한 곳만 바꿉니다. 완료 목표는 11/5(목) 하나입니다.

| 바로 할 수 있는 것 | 남의 것이 필요한 것 | 그동안 쓰는 가짜 (`contracts/examples/`) | 바꿔 끼우는 법 |
| --- | --- | --- | --- |
| 문서 검수, `team3-index` · `team3-search` 만들기, 질문 세트 | 없음 (본체 없이 단독으로 됨) | 본체가 보낼 요청 = `search.json`의 `request` (`flow.py call team3-search`), 응답 모양 = `response` | 다영이 본체 `Support settings` 노드의 `SEARCH` 값을 `real`로 바꾸면 끝. 문서가 바뀌면 build → 재색인만 |

⏳ **진짜를 기다려야 하는 것**: 청킹 비교 · hit@k · `SCORE_MIN` (문서 검수가 끝난 뒤 잼).

- 저장소 맨 위 폴더에서 `git pull` → `python3 tools/packs.py build`. 문서 **원본은 `packs/<팩>/knowledge/`**, `knowledge/`는 빌드 결과입니다 (빌드하면 덮어써져서 거기서 고치면 사라짐).
- 문서 10개: 공통 `scope-and-escalation` · `request-records-guide` · `mgr-owner-rules`(약국장 전용), 회수 `recall-first-response` · `recall-customer-guide`, 마감 `closing-checklist` · `closing-cash-mismatch`, 어르신 `senior-cold-sleep-stomach` · `senior-pain-joint` · `senior-safety-signals`.
- 읽을 것: `00-DESIGN.md` 4 · 6절, 샘 안내서 `Lecture/80-82-Project/student/05-RAG-DESIGN-GUIDE.md` · `templates/RAG-ARCHITECTURE-TEMPLATE.md`, 수업 71일차 RAG 실습 `Last3Mon/71/AGENTS.md` 5절 (확인된 노드).
- data-api가 우리 문서를 주는지: `curl -s localhost:8800/docs` → 문서 10개 이름이 나와야 함 (띄우는 법 `infra/README.md`).

## 1. 지식 문서 검수 (11/5 오전까지)

- 10개 문서를 읽고 고칩니다. 서로 모순 없게 (예: 현금 차액은 약국장, 냉장고 온도는 약사처럼 **누구에게 넘기는지**가 문서마다 같게), 절당 150~400자 (`packs.py check`가 벗어나면 알려 줌).
- 마감 문서: 냉장고 온도 기록 = 약국 법 의무가 아니라 우리 약국 규칙, 청구 전송 = 월간 업무 (틀리게 쓰지 않기).
- 회수 문서: 손님 안내 = 약국의 선택 서비스, 별도 동의 손님만.
- 어르신 문서 3개: 공공데이터 원문(DUR 파일 `15089521` · `15089525` · `15127983`은 로그인 없이 받음, e약은요 `15075057`은 키 필요 — 확인된 API 주소 · 버전은 완전체본 1절 표)과 한 줄씩 대조, 원문에 없는 문장은 지움, 출처 · 기준일 채움, 먹는 양(용량) 숫자는 쓰지 않음. 파일 데이터는 `https://www.data.go.kr/data/<ID>/fileData.do`에서 로그인 없이 내려받고, 원본은 저장소에 넣지 않음.
- 키는 저장소에 쓰지 않습니다. 필요하면 각자 data.go.kr에서 같은 ID로 활용신청 (자동 승인), 시험 · 색인에는 이미 만든 마크다운 문서를 쓰므로 키가 없어도 됩니다.
- **직접 정함**: 문서를 더 나눌지 (예: 어르신 성분을 문서 하나에 성분 하나로), 절 제목을 어떤 말로 (검색이 잘 되게).

## 2. `team3-index` 설계

**고정**: 웹훅 `team3-index`, 결과 `{docs, indexed_chunks, seconds, kb_version, per_doc}`, 문서 이름 앞 `mgr-` → `access_level: owner`, owner 청크는 **owner 전용 메모리 키에만**, 청크 메타데이터에 `doc` · `section` · `access_level` (본체 `sources`가 씀).

**직접 정함**:

| 칸 | 정할 것 | 생각할 점 |
| --- | --- | --- |
| 청킹 | 절 단위 / 글자 수 / 섞기, 오버랩 | 우리 절 길이 분포를 먼저 잼. 절 단위면 오버랩 0이 보통이고 그 까닭을 씀 |
| 청크 앞머리 | 문서 제목 · 절 제목을 붙일지 | 71일차: 붙이면 문서를 더 잘 찾음 |
| 메모리 키 이름 | `<도메인>_<용도>_v<버전>_<권한>` 같은 규칙 | 버전 전환 · 롤백을 어떻게 (설계서 4절) |
| 노드 구성 | 71 `lab01-example2-index` 위에 무엇을 더할지 | 권한별 저장 2개, 결과 요약 |

## 3. `team3-search` 설계

**고정**: 웹훅 `team3-search`, 요청 `{query, access_levels, top_k?, type?}`, 응답 `{"evidence": [{"doc","title","section","text","score","access_level"}], "kb_version", "search_ms"}` 점수 내림차순, 비면 `[]` (500 아님). `access_levels`에 `owner`가 없으면 owner 키는 **검색하지 않음**.

**직접 정함**: `top_k` 기본값, 같은 `doc+section` 중복 빼기, 두 키 결과 합치는 법, `type`을 쓸지 (검색 범위 좁히기).

## 4. 비교 실험 (숫자는 직접 재서)

- 질문 세트 12개를 먼저 정함 (`docs/rag-eval/questions.json`, 기대 문서 포함 — 완전체본 4절 예).
- 청킹 두 가지 이상 × 같은 질문 → 청크 수 · 길이 최소 / 중앙 / 최대 · hit@1 · hit@3.
- `top_k` 비교, `SCORE_MIN` 정하기: 정상 질문들의 1등 점수 중 **가장 낮은 값**과 문서 밖 질문(정수기 · 공유기 · 간판 조명)들의 1등 점수 중 **가장 높은 값**을 재고, 그 사이 값을 고름 (예: 가운데). 정한 값은 다영에게 알림.
- 색인 시간 · 토큰 · 비용, 문서 ×10 · ×100 어림.

## 5. 완료 기준 (완전체본과 같음)

- 샘 실습 폴더에서 `uv run tools/flow.py check <저장소>/workflows/team3-index.json` · `team3-search.json` 오류 0, push 뒤 `call team3-index` → docs 10, owner 청크는 owner 키에만.
- `call team3-search` `{"query":"마감 때 계산대 현금 순서","access_levels":["all"]}` → 1등 `closing-checklist`. `{"query":"마감 차액 승인 기준","access_levels":["all"]}` → `mgr-owner-rules` 없음, `["all","owner"]`면 있음.
- 질문 12개 hit@3 ≥ 10/12, `docs/RAG-ARCHITECTURE.md` 1~5절을 잰 값으로, 어르신 문서 출처 · 기준일 채움.

## 6. 막혔을 때

- 완전체본 같은 절 (2.1 `Make chunks` 코드, 3.1 `Shape evidence` 코드, 6절 표).
- push 하면 n8n이 재시작돼 색인이 사라집니다 → 늘 재색인.

## 7. 금지

- 실제 약국 매뉴얼 복사, 원문에 없는 약 정보, 용량 숫자, 검색 뒤 권한 거르기, 공공데이터 원본을 레포에 커밋, 서브에이전트 · `/review`.

## 8. 에이전트 요청문 뼈대 (빈칸을 내 설계로 채워서)

```text
AGENTS.md, 00-DESIGN.md 4·6절, specs/02-rag.md 를 읽고 workflows/team3-index.json 과 workflows/team3-search.json 을 만들어 줘.
청킹은 <내 방식>, 청크 앞머리는 <붙일 것>, 메모리 키는 <이름 규칙>. owner 문서는 owner 키에만 넣고, search 는 access_levels 에 owner 가 있을 때만 그 키를 봐.
노드 type/typeVersion 은 Last3Mon/71/AGENTS.md 5절의 검증된 것만, 출발점은 Last3Mon/71/reference/lab01-example2-index.json · -search.json.
먼저 노드 순서를 보여 주고, flow.py check 오류 0 까지 고친 뒤 push · call 명령을 알려 줘. knowledge/ 는 고치지 마.
```
