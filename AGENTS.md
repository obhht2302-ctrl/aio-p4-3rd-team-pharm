# AGENTS.md · 3팀 창고형 약국 업무 도우미 (team3-support)

CLI 코딩 에이전트(codex · claude · agy)가 이 저장소에서 일할 때 따르는 규칙입니다. 샘 `09-AGENT-WORKING-RULES`와 64~79일차 `AGENTS.md`를 바탕으로 했고, 80일차 키트의 `AGENTS.md`가 나오면 2 · 4절을 맞춥니다 (키트 확인). claude는 `CLAUDE.md`의 `@AGENTS.md` 한 줄로 이 파일을 읽습니다.

## 1. 작업 순서

1. 요청과 그 역할의 `specs/0N-*.md`를 읽고, **입력 · 노드 순서 · 결과 모양**을 3~5줄로 먼저 보여 준다. 실패가 있는 요청이면 "어떤 실패가 어디로 가는지" 표를 같이 보여 준다.
2. 명세가 가리킨 파일만 고친다. **새 파일은 명세나 요청에 있을 때만.** 다른 역할의 파일은 읽기만 한다 (`00-DESIGN.md` 8절).
3. 워크플로우면 `uv run <샘 키트>/tools/flow.py check workflows/<파일>.json` → 오류 0까지. 코드면 그 폴더의 시험 명령 (`api/`: `python3 -m pytest -q`).
4. 한국어로 보고: 바꾼 노드 · 파일, check · 시험 결과, 사람이 실행할 `push` · `test` 명령.
5. push · test는 사람이 한다 (시키면 직접 해도 됨). 같은 곳을 3번 고쳐도 실패하면 멈추고 다른 방법을 제안한다.

## 2. 환경 (바꾸지 말 것)

| 항목 | 값 |
| --- | --- |
| n8n | 2.42.6 (각자 노트북 `~/day65-n8n`, 팀 VM은 팀장이 배포), 웹훅 `http://localhost:5678/webhook/<path>` (n8n 안에서도 같음) |
| OpenAI Credential | id `openAiCourse0001`, 이름 `OpenAI (.env)`, 채팅 `gpt-4.1-mini`, 임베딩 `text-embedding-3-large`. Ollama 없음 |
| data-api | n8n 안 `http://data-api:8800`, 터미널 `http://localhost:8800`. 지금 기준은 77일차 판, 80일차 판이 나오면 맞춤 (키트 확인) |
| 팀 웹훅 인증 | Header Auth Credential `team3WebhookKey` (머리글 `X-Team-Key`) |
| data-api 나가는 호출 | Credential `dataApiKey` (`X-Api-Key`, 80일차 판에서 요구 — 키트 확인) |
| 도구 | 샘 `tools/flow.py` (check · push · call · test · bench · fault · llm · ops · doctor). **push는 n8n을 재시작**하므로 push 뒤 `team3-index`를 다시 부른다 |
| 팩 도구 | `python3 tools/packs.py build` → `knowledge/` · `data/` · `cases/team.json` · `config/type-policy.json` 생성, `check`로 샘 기준 확인 |

## 3. 계약

`00-DESIGN.md` 2절(요청 · 응답 · route · reason · 400 codes)과 3절(하위 웹훅 페이로드 · 처리 방식 4개 · Type policy)을 그대로 따른다. 계약을 바꿔야 하면 코드가 아니라 `00-DESIGN.md`를 먼저 고친다 (리드 승인).

## 4. 검증된 노드 (n8n 2.42.6)

샘 실습의 검증된 노드 `type` / `typeVersion`만 쓴다: `Last3Mon/71/AGENTS.md` 5절 (Vector Store In-Memory · Embeddings · Loader · Agent), `72/AGENTS.md` 5절 (시간 재기 · 캐시 · 대체 경로), `73/AGENTS.md` 5절 (입력 검증 · 규칙 · 판별 · 출력 필터 · 감사 기록), `76/AGENTS.md` 5절 (재시도 · 멱등 키 · Error Trigger · DLQ · 알림). 노드 이름은 역할 명세의 노드 표와 **글자까지 같게** (설계서 노드 이름 = JSON 노드 이름, 평가 항목).

## 5. 파일 규칙

- 워크플로우 파일 하나 = 워크플로우 하나. `"settings": {"executionOrder": "v1", "errorWorkflow": "team3Errors00001"}`.
- `team3-errors.json`만 맨 위에 `"id": "team3Errors00001"`. 다른 파일은 id를 쓰지 않는다 (push가 파일 이름으로 정함).
- `knowledge/` · `data/` · `cases/team.json` · `config/`는 **빌드 결과**다. 고칠 땐 `packs/<팩>/`의 원본을 고치고 `python3 tools/packs.py build`.
- 키 · 토큰 · 연락처를 JSON · 문서 · 지시문에 쓰지 않는다. Credential id만. 화면 코드(`web/`)에 웹훅 키를 넣지 않는다.

## 6. 하지 말 것

- 공통 계약(요청 · 응답 칸, route 5개 값)을 바꾸지 않는다.
- `cases/*.json`의 기대 결과를 시험 통과용으로 바꾸지 않는다. 틀렸다고 생각되면 사람에게 말한다.
- 워크플로우 안에서 고장 스위치 · `*-reset` · `*-clear`를 부르지 않는다.
- 실패를 숨기지 않는다. LLM이 멈추거나 JSON을 못 읽으면 자동 답변하지 않고 이관한다 (fail-closed).
- 실제 문자 · 메일을 보내지 않는다. 손님 안내는 연습용 기록만 남긴다.
- n8n 컨테이너 · Credential을 만들거나 지우지 않는다. `.env` · 키를 출력하지 않는다.
- 서브에이전트 · `/review` 같은 다중 에이전트 호출을 하지 않는다. 바꾼 곳은 스스로 diff로 확인한다.
