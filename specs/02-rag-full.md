# 02 · RAG 명세 (완전체본) — 지식 문서 검수 + `team3-index` · `team3-search` + RAG 설계서

> 설계판으로 직접 해 봐도 되고, 완전체본을 그대로 에이전트에 던져도 돼요. 설계판으로 하다가 막히면 완전체본의 같은 절을 보세요. (설계판: [`02-rag.md`](02-rag.md))

- 맡은 사람: 영민 · 마감: 11/5(목) · 별 ★★☆
- 과제 한 문장: **지식 문서 10개를 검수하고, 권한별 메모리 키 2개에 색인하고, 질문을 받으면 점수 붙은 근거 조각을 돌려주는 검색 모듈을 만들고, 청킹 비교 숫자로 RAG 설계서를 쓴다.**
- 규모: 워크플로우 2개 (각 노드 12개 안팎), 비교 실험 2가지 (절 단위 vs 글자 수), 질문 세트 12개. RAG 설계서(제안 배점 30)가 이 역할의 산출물입니다.

> **처음 읽는 분께** — 이 저장소는 가상 약국의 업무 문의를 n8n 워크플로우로 답하는 3팀 프로젝트예요. 이 명세는 **RAG 담당(영민)** 몫입니다. RAG(검색 증강 생성)는 "질문과 가까운 문서 조각을 먼저 찾아서 그 조각을 근거로 답하게 하는 방식"이고, 이 역할은 그중 **문서를 조각내 저장하고(색인) 찾아 주는(검색) 부분**을 맡습니다. 답을 만드는 본체는 **다영(오케스트레이션 담당)**이 만들고, 우리 검색을 웹훅으로 부릅니다.
> 명령은 모두 **레포 맨 위 폴더 `~/aio-p4-3rd-team-pharm`**에서 칩니다 (`flow.py`만 샘 키트 폴더에서). 레포 받기 · n8n · data-api 켜기는 아래 0절 '시작 전 준비'에 있어요.

**처음 나오는 말** (RAG에서만 쓰는 말. 나머지는 [README 용어 표](../README.md#용어))

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

| 이 역할이 정하는 것 | 바꾸면 안 되는 것 |
| --- | --- |
| 문서 문장 · 절 제목 (검수하면서), 청킹 방식 · `top_k` · `SCORE_MIN` (재서), 질문 세트 12개, 메모리 키 버전 이름 | 문서 6개 이상 · 절 3개 이상, 가짜 데이터 (어르신 문서만 공공 약 정보 + 출처), **검색 전** 권한 필터 (메모리 키 2개), `team3-search`가 돌려주는 칸 (`00-DESIGN.md` 3.3절), `mgr-` = 약국장 전용, 문서 파일 이름 (시나리오 `sources`가 봄) |

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

# 4) data-api 켜기 — 샘 77판 server.py에 우리 문서 · 데이터를 붙인 것 (샘 77 data-api는 먼저 끔)
cd ~/aio-01d4-stu/Last3Mon/77/data-api && docker compose down
cd ~/aio-p4-3rd-team-pharm && cp -n infra/.env.example infra/.env    # 처음 한 번: infra/.env의 SAM_DATA_API를 내 홈 경로로 고침
docker compose -f infra/compose.team3.yml --env-file infra/.env up -d data-api

# 5) 팀 웹훅 키 — 리드(태웅)에게 디코 DM으로 받아 터미널에서만 (파일 · 레포에 쓰지 않음, 새 터미널마다 다시)
export FLOW_WEBHOOK_KEY=받은값

# 6) flow.py는 샘 키트 폴더에서 실행하고, 파일은 레포 경로로 넘김
cd ~/aio-01d4-stu/Last3Mon/77 && uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-support.json
```

| n8n Credential 이름 (값은 n8n에만, 레포 · 문서에 쓰지 않음) | 쓰는 곳 |
| --- | --- |
| `OpenAI (.env)` | 수업 때 이미 있음. 채팅 `gpt-4.1-mini` · 임베딩 `text-embedding-3-large` |
| `team3WebhookKey` | 팀 웹훅 Header Auth (머리글 `X-Team-Key`, 값 = 5)의 팀 웹훅 키) |
| `dataApiKey` | data-api로 나가는 호출의 `X-Api-Key` (80일차 키트에서 요구 — 키트 확인) |

- 77판 `flow.py`는 `FLOW_WEBHOOK_KEY`를 보내지 않아요 (80일차 키트판부터 보냄 — 키트 확인). 그래서 키트가 나오기 전 노트북 시험은 웹훅 노드 Authentication을 `None`으로 두고 하고, 키트판이 나오면 Header Auth(`team3WebhookKey`)로 바꿉니다. 가짜 웹훅(`workflows/stubs/`)은 처음부터 인증이 없습니다.

처음 보는 말은 [README 용어 표](../README.md#용어)에 있어요. 공통 시나리오 번호 뜻 (`cases/common.json`, 자세히는 `00-DESIGN.md` 7절): WF-01 문서로 답 · WF-02/02b 정보 부족 → 보완 질문, 3번째면 이관 · WF-03 문서에 없는 일 → 이관 · WF-04 티켓 API 장애 → DLQ · 알림 · WF-05 권한 밖 문서 (약국장 전용) · WF-06 남의 접수 건 · WF-07 연락처 가림 · WF-08 주입 공격 차단 · WF-09 같은 요청 두 번 → 티켓 1건 · WF-10 LLM 멈춤 · WF-11 접수 조회 지연 · WF-12 회수 긴급 + 접수 조회 · WF-13 잘못된 입력 → 400.

### 혼자 끝까지 확인하는 법

```bash
cd ~/aio-01d4-stu/Last3Mon/77
uv run tools/flow.py push ~/aio-p4-3rd-team-pharm/workflows/team3-index.json ~/aio-p4-3rd-team-pharm/workflows/team3-search.json
uv run tools/flow.py call team3-index ~/aio-p4-3rd-team-pharm/requests/empty.json                     # 색인 (push 뒤마다)
uv run tools/flow.py call team3-search ~/aio-p4-3rd-team-pharm/requests/search-closing.json           # 본체 없이 검색만. 1등 closing-checklist
uv run tools/flow.py call team3-search ~/aio-p4-3rd-team-pharm/requests/search-staff-owner-doc.json   # 직원 권한 → mgr-owner-rules가 나오면 실패
uv run tools/flow.py call team3-search ~/aio-p4-3rd-team-pharm/requests/search-senior.json            # 어르신 문서
```

### 가짜 먼저, 준비되면 바꿔 끼우기

계약이 먼저 고정돼 있어서 오늘부터 바로 시작합니다. 남의 부품이 없으면 `contracts/examples/`의 예시를 그대로 쓰는 가짜로 대신하고, 진짜가 준비되면 스위치 한 곳만 바꿉니다. 완료 목표는 11/5(목) 하나입니다.

| 바로 할 수 있는 것 | 남의 것이 필요한 것 | 그동안 쓰는 가짜 (`contracts/examples/`) | 바꿔 끼우는 법 |
| --- | --- | --- | --- |
| 문서 검수, `team3-index` · `team3-search` 만들기, 질문 세트 | 없음 (본체 없이 단독으로 됨) | 본체가 보낼 요청 = `search.json`의 `request` (= `requests/search-closing.json`, `flow.py call team3-search`), 응답 모양 = `response` | 다영이 본체 `Support settings` 노드의 `SEARCH` 값을 `real`로 바꾸면 끝. 문서가 바뀌면 build → 재색인만 |
| ⏳ **진짜를 기다려야 하는 것** | 청킹 비교 · hit@k · `SCORE_MIN` (문서 검수가 끝난 뒤 잼). | — (가짜로는 못 함) | 연결 뒤 진짜로 잼 |

1. `git pull` → `python3 tools/packs.py build` → `knowledge/`에 문서 10개가 생깁니다.
2. 읽을 것: `00-DESIGN.md` 4 · 6절, 샘 `05-RAG-DESIGN-GUIDE.md`, `templates/RAG-ARCHITECTURE-TEMPLATE.md`, `Last3Mon/71/AGENTS.md` 5절 (검증된 노드).
3. 출발점: `Last3Mon/71/reference/lab01-example2-index.json` · `lab01-example2-search.json` (노드 이름 · 연결을 거의 그대로 씀).
4. **문서 원본은 `packs/<팩>/knowledge/*.md`** 입니다. `knowledge/`는 빌드 결과라 거기서 고치면 다음 build 때 사라집니다.
5. data-api가 우리 문서를 내어 주는지 확인: `curl -s localhost:8800/docs` → 10개 이름이 나와야 함 (`infra/compose.team3.yml`의 data-api가 `knowledge/`를 `/data/docs`로 읽음). 샘 data-api가 켜져 있으면 끄고 우리 것을 켭니다 (`infra/README.md`).

## 1. 지식 문서 검수 (11/5 오전까지)

| 문서 (원본 위치) | 할 일 |
| --- | --- |
| `_core/knowledge/scope-and-escalation` · `request-records-guide` · `mgr-owner-rules` | 문장 다듬기, 서로 모순 없는지 (누구에게 넘기나가 세 문서에서 같게) |
| `closing/knowledge/closing-checklist` · `closing-cash-mismatch` | 사실은 리드가 가진 약국 마감 조사 요약과 대조. **냉장고 온도 기록 = 약국 법 의무 아님 (우리 약국 규칙), 청구 전송 = 월간 업무**를 틀리게 쓰지 않기 |
| `recall/knowledge/recall-first-response` · `recall-customer-guide` | 손님 안내 = 약국의 선택 서비스, 별도 동의 손님만, 약 이름 + 연락처를 같이 남기지 않기 |
| `senior/knowledge/senior-cold-sleep-stomach` · `senior-pain-joint` · `senior-safety-signals` | **공공데이터 원문과 한 줄씩 대조**, 원문에 없는 문장은 지움, 기준일 칸 채움 (아래) |

- 형식: `# 제목` 한 줄 → `## 1. 절 제목` 3~4개 → 글머리표. 절당 150~400자 (`python3 tools/packs.py check`가 벗어나면 "참고"로 알려 줌).
- 어르신 문서 원문 대조:
  - DUR 파일 (로그인 없이 받음): 노인주의 `15089521`, 병용금기 `15089525`, 심평원 DUR 의약품 목록 `15127983` (노인주의 사유 칸 `약품상세정보`). 받은 원본은 **레포에 넣지 않고** 노트북에만.
  - e약은요 (`15075057`)는 API 키가 필요합니다 (아래 표). 키가 없으면 식약처 의약품안전나라 화면에서 성분별로 손으로 대조하고, 대조한 날짜를 기준일로 적습니다.
- 공공 API (2026-11-02 실제 호출 200 확인한 주소, 앞에 `https://apis.data.go.kr/` — **버전을 바꿔 쓰지 않기**):

  | 데이터 | 포털 ID | 주소 |
  | --- | --- | --- |
  | 의약품 회수 · 판매중지 | 15059114 | `1471000/MdcinRtrvlSleStpgeInfoService05/getMdcinRtrvlSleStpgelList05` · `…Item05` |
  | e약은요 (일반의약품 개요) | 15075057 | `1471000/DrbEasyDrugInfoService/getDrbEasyDrugList` |
  | 의약품 제품 허가정보 | 15095677 | `1471000/DrugPrdtPrmsnInfoService08/…Inq08` (Service07은 403) |
  | DUR 품목정보 · DUR 성분정보 | 15059486 · 15056780 | 포털 명세의 첫 오퍼레이션 200 |

- **키는 저장소에 쓰지 않습니다** (리드 개인 키). 원문 대조가 필요하면 각자 data.go.kr에서 같은 ID로 활용신청 (자동 승인)하고, 키는 내 노트북 환경 변수에만 둡니다. 시험 · 색인에는 이미 만든 마크다운 문서를 쓰므로 키가 없어도 됩니다.
  - 숫자(용량 · 횟수)는 넣지 않습니다. 도우미는 양을 정해 주지 않아요.
- 검수가 끝난 문서는 머리의 "검수 전 초안" 줄을 지우고 `python3 tools/packs.py build && python3 tools/packs.py check` → 커밋.

## 2. `team3-index` 노드 표

| 노드 이름 | 타입 | 하는 일 |
| --- | --- | --- |
| `Index webhook` | webhook v2, `path: team3-index`, responseNode, Header Auth | `{}` 또는 `{"kb_version":"pharm_kb_v2","chunking":"section"|300}` |
| `Index settings` | code | `kb_version` (기본 `pharm_kb_v1`), `chunking` (기본 `section`), `t0` |
| `List docs` → `One item per doc` → `Get doc` | httpRequest · splitOut · httpRequest (71과 같음) | `GET /docs` → 문서마다 `GET /docs/<name>` |
| `Make chunks` | code | 아래 2.1 |
| `By access` | if (`access_level == "owner"`) | true → `Store owner`, false → `Store all` |
| `Store all` · `Store owner` | vectorStoreInMemory 1.3, `mode: insert`, `memoryKey: {{kb_version}}_all` / `{{kb_version}}_owner`, `clearStore: true` | 권한별 파티션 (검색 전 필터의 바탕) |
| `Embeddings` | embeddingsOpenAi 1.2, `text-embedding-3-large` | 두 저장소에 연결 (`flow.py check`가 막으면 `Embeddings owner`를 하나 더) |
| `Chunk loader all` · `Chunk loader owner` | documentDefaultDataLoader 1.1, `textSplittingMode: simple`, metadata 7칸 (아래) | 청크는 Code가 정함 |
| `Index summary` | code | `{docs, indexed_chunks, seconds, kb_version, chunking, per_doc: [{doc, chunks, access_level}]}` |
| `Send index result` | respondToWebhook | 200 |

- memoryKey를 표현식으로 쓰기 어려우면 `pharm_kb_v1_all` · `pharm_kb_v1_owner`를 글자로 두고, 버전을 올릴 때 두 노드 값을 함께 바꿉니다 (설계서 4절 "전환 방법"에 그대로 적기).
- **push 하면 n8n이 재시작돼 색인이 사라집니다** (77판 `flow.py`). push 뒤 늘 `flow.py call team3-index requests/empty.json`.

### 2.1 `Make chunks` 코드

```js
const s = $('Index settings').first().json;
const chunks = [];
for (const item of $input.all()) {
  const { name, title, text } = item.json;
  const access_level = name.startsWith('mgr-') ? 'owner' : 'all';
  const sections = text.split(/\n(?=## )/).slice(1);           // 첫 덩어리(# 제목, 머리 줄)는 버림
  sections.forEach((piece, i) => {
    const section = piece.split('\n')[0].replace(/^##\s*/, '').trim();
    const body = piece.split('\n').slice(1).join('\n').trim();
    const parts = s.chunking === 'section' ? [body] : (body.match(new RegExp(`[\\s\\S]{1,${Number(s.chunking)}}`, 'g')) || []);
    parts.forEach((p, j) => chunks.push({ json: { doc: name, title, section, chunk: `${i + 1}.${j + 1}`, access_level,
      kb_version: s.kb_version, text: `${title} › ${section}\n${p}` } }));
  });
}
return chunks;
```

- 글자 수 방식의 오버랩 50자는 `parts`를 만들 때 앞 조각 끝 50자를 다음 조각 앞에 붙입니다 (비교 실험 B).
- metadata 7칸: `doc`, `title`, `section`, `chunk`, `access_level`, `kb_version`, `type`(문서 이름 앞부분 `closing-` → `closing`, `mgr-`·공통 → `core`).

## 3. `team3-search` 노드 표

| 노드 이름 | 타입 | 하는 일 |
| --- | --- | --- |
| `Search webhook` | webhook v2, `path: team3-search`, responseNode | `{query, access_levels, top_k=4, type?}` |
| `KB settings` | code | `kb_version`, `top_k`, `t0`, `want_owner = access_levels.includes('owner')` |
| `Search all` | vectorStoreInMemory 1.3 `mode: load`, memoryKey `pharm_kb_v1_all`, `prompt: {{query}}`, `topK: {{top_k}}`, `includeDocumentMetadata: true`, `alwaysOutputData: true` | 모두가 보는 키 |
| `Need owner?` | if (`want_owner`) | true → `Search owner` |
| `Search owner` | 같은 노드, memoryKey `pharm_kb_v1_owner` | 약국장만 |
| `Merge hits` | merge v3, `numberInputs: 2` | 한쪽이 비어도 모음 (76일차) |
| `Shape evidence` | code | 아래 3.1 |
| `Send evidence` | respondToWebhook | 200 `{evidence, kb_version, search_ms}`. 저장소가 비면 `evidence: []` (500 아님) |
| `Embeddings` | embeddingsOpenAi 1.2 (index와 같은 모델) | 두 검색 노드에 연결 |

- 권한은 **키를 고르는 것으로** 거릅니다 (검색 전 필터). 직원 · 약사 · 환자 요청엔 `Search owner`가 아예 돌지 않습니다 → WF-05에서 `mgr-owner-rules`가 나올 수 없음.
- 점수 기준(`SCORE_MIN`)으로 거르는 일은 본체(`Build context`)가 합니다. 검색은 점수만 붙여 돌려줍니다.

### 3.1 `Shape evidence` 코드

```js
const s = $('KB settings').first().json;
const seen = new Set();
const evidence = $input.all().filter(i => i.json.document)
  .map(i => ({ ...i.json.document.metadata, text: i.json.document.pageContent, score: Math.round(i.json.score * 1000) / 1000 }))
  .sort((a, b) => b.score - a.score)
  .filter(e => { const k = `${e.doc}|${e.section}`; if (seen.has(k)) return false; seen.add(k); return true; })
  .slice(0, s.top_k)
  .map(({ doc, title, section, text, score, access_level }) => ({ doc, title, section, text, score, access_level }));
return [{ json: { evidence, kb_version: s.kb_version, search_ms: Date.now() - s.t0 } }];
```

## 4. 비교 실험 (RAG 설계서 2 · 3절의 숫자)

1. **질문 세트를 먼저 정합니다**: `docs/rag-eval/questions.json` 12개 = 공통 WF-01 · 05 · 12 + 팀 T-01 · T-03 · T-04 · T-07 · T-31 · T-33 + 문서별 추가 3개. 칸: `{"q", "user_access": ["all"], "expect_doc"}`. WF-05는 `expect_doc: "closing-cash-mismatch"` (`mgr-`가 나오면 실패).
2. 청킹 A (절 단위, 오버랩 0) vs B (300자 + 오버랩 50): 각각 `call team3-index` (`chunking`만 바꿈) → 12개 질문을 `call team3-search`로 → hit@1 · hit@3. 청크 수, 길이 최소 · 중앙 · 최대 (`Index summary`의 `per_doc`, 또는 문서 글자 수를 직접 셈).
3. `top_k` 3 vs 4, `SCORE_MIN` 후보: 정상 질문의 1등 점수 분포 vs 문서 밖 질문 (정수기 · 공유기 · 간판 조명)의 1등 점수 분포 사이. 71일차 실측 (규정 질문 0.46~0.62, 규정 밖 0.20~0.26)은 참고만, **우리 문서로 다시 잽니다.** 정한 값을 다영에게 알려 `Build context` 상수와 `00-DESIGN.md` 3.2절 옆에 적습니다.
4. 색인 시간 · 토큰 어림: `Index summary.seconds`, 문서 글자 합 → 토큰 어림 → 비용 (단가 출처 적기). 문서 ×10 · ×100일 때 어림 (설계서 5절).
5. 결과 JSON을 `docs/rag-eval/`에 남기고 숫자는 거기서만 옮깁니다.

## 5. 완료 기준

```bash
uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-index.json && uv run tools/flow.py check ~/aio-p4-3rd-team-pharm/workflows/team3-search.json
uv run tools/flow.py push ~/aio-p4-3rd-team-pharm/workflows/team3-index.json ~/aio-p4-3rd-team-pharm/workflows/team3-search.json
uv run tools/flow.py call team3-index ~/aio-p4-3rd-team-pharm/requests/empty.json       # docs 10, indexed_chunks 39 안팎, owner 청크는 owner 키에만
echo '{"query":"마감 때 계산대 현금 순서","access_levels":["all"]}' > /tmp/q1.json && uv run tools/flow.py call team3-search /tmp/q1.json
#  → evidence[0].doc = closing-checklist
echo '{"query":"마감 차액 승인 기준","access_levels":["all"]}' > /tmp/q2.json && uv run tools/flow.py call team3-search /tmp/q2.json
#  → mgr-owner-rules 없음 ;  access_levels ["all","owner"] 이면 있음
```

- 질문 12개 hit@3 ≥ 10/12 (못 미치면 절 제목 · 문장 보강 → 다시 재고, 고치기 전 · 뒤 숫자를 둘 다 남김).
- `docs/RAG-ARCHITECTURE.md` 1~5절을 잰 값으로 채움 (원본 문서 표 · 청킹 비교 · 임베딩 3072차원 · 코사인 · 메모리 키 · 백업 복구 확장).
- 어르신 문서 3개의 출처 · 기준일 칸이 채워지고 "검수 전 초안" 줄이 지워짐.

## 6. 막혔을 때

| 증상 | 할 일 |
| --- | --- |
| `/docs`가 샘 문서 8개를 줌 | 샘 data-api가 켜져 있음 → 끄고 `infra/compose.team3.yml`의 data-api를 켬 |
| 검색이 늘 빔 | push 뒤 재색인 안 함, 또는 index · search의 memoryKey 글자가 다름 |
| `Store owner`가 안 돌아 owner 키가 비어 있음 | `mgr-owner-rules`가 빌드돼 `knowledge/`에 있는지, `By access` 조건 |
| hit@3가 낮음 | 청크 앞에 `제목 › 절` 붙였는지, 절 제목을 질문에서 쓰는 말로 |

## 7. 금지

- 실제 약국 매뉴얼 복사, 원문에 없는 약 정보 문장 남기기, 용량 숫자 쓰기, 검색 뒤에 권한 거르기, 본체 분기 로직을 search에 넣기, 공공데이터 원본 파일을 레포에 커밋, 서브에이전트 · `/review`.

## 8. 에이전트 요청문 (복붙)

```text
AGENTS.md, 00-DESIGN.md 4·6절, specs/02-rag-full.md 를 읽고 workflows/team3-index.json 과 workflows/team3-search.json 을 만들어 줘.
노드 이름 · 연결은 2 · 3절 표 그대로, Make chunks 와 Shape evidence 코드는 2.1 · 3.1 을 그대로 넣어.
노드 type/typeVersion 은 ~/aio-01d4-stu/Last3Mon/71/AGENTS.md 5절의 검증된 것만, 출발점은 Last3Mon/71/reference/lab01-example2-index.json · lab01-example2-search.json.
먼저 두 워크플로우의 노드 순서를 보여 주고, flow.py check 오류 0 까지 고친 뒤 push · call 명령(5절)을 알려 줘.
문서 검수는 하지 마 (사람이 함). knowledge/ 는 빌드 결과라 고치지 마.
```
