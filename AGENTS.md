# AGENTS.md · 3팀 창고형 약국 약사 지원 봇 (team3-support)

CLI 코딩 에이전트(codex · claude · agy)가 이 저장소에서 n8n 워크플로우와 문서를 만들 때 따르는 규칙. 샘 `Last3Mon/80/AGENTS.md`(키트 확인)와 `09-AGENT-WORKING-RULES`를 바탕으로 리드가 첫날 다듬는다. (claude는 `CLAUDE.md`에 `@AGENTS.md` 한 줄)

## 1. 작업 순서
1. 요청을 읽고 입력 · 노드 순서 · 결과 모양을 3~5줄로 먼저 보여 준다. 이관·실패가 있는 요청이면 "어떤 실패가 어디로 가는지" 표를 같이.
2. `workflows/<파일>.json`을 고친다. **새 파일은 요청받을 때만.** 다른 사람이 맡은 파일은 손대지 않는다 (`00-DESIGN.md` 8절).
3. `uv run ~/aio-01d4-stu/Last3Mon/80/tools/flow.py check workflows/<파일>.json` → ✘ 0이 될 때까지.
4. 한국어로 보고: 바꾼 노드, check 결과, 사람이 실행할 `push` · `test` 명령.
5. push · test는 사람이 한다 (시키면 직접 해도 됨). 같은 곳을 3번 고쳐도 실패하면 멈추고 다른 방법을 제안한다.
6. 문서 요청(`docs/*.md`, `knowledge/*.md`)이면 워크플로우를 만들지 않고 문서만 쓴다.

## 2. 환경 (바꾸지 말 것)
| 항목 | 값 |
|---|---|
| n8n | 2.42.6 (샘 VM 또는 각자 `~/day65-n8n`), 웹훅 `http://localhost:5678/webhook/<path>` (n8n 안에서도 같음) |
| OpenAI Credential | id `openAiCourse0001`, 이름 `OpenAI (.env)`, `gpt-4.1-mini` · `text-embedding-3-large`. Ollama 없음 |
| 데이터 API | n8n 안 `http://data-api:8800`, 터미널 `http://localhost:8800` (단위 프로젝트 판 `Last3Mon/80/data-api`, 우리 `data/`·`knowledge/`를 읽음) |
| 팀 웹훅 인증 | Header Auth Credential `team3WebhookKey`(머리글 `X-Team-Key`). 데이터 API 나가는 호출은 Credential `dataApiKey`(`X-Api-Key`) |
| 도구 | `flow.py {doctor,check,push,call,test,bench,ops,fault,llm,gate}` |

## 3. 계약
`00-DESIGN.md` 2절(요청·응답·route·reason·400 codes)과 3.1절(하위 워크플로우 페이로드)을 그대로 따른다. 계약을 바꿔야 하면 코드가 아니라 `00-DESIGN.md`를 먼저(리드 승인).

## 4. 검증된 노드 (n8n 2.42.6)
샘 실습 `Last3Mon/71/AGENTS.md` 5절(Vector Store In-Memory · Embeddings · Loader · Agent), `73/AGENTS.md` 5절(입력 검증 · 규칙 · 판별 · 출력 필터 · 감사 로그), `76/AGENTS.md` 5절(재시도 · 멱등 키 · Error Trigger · DLQ · 알림)의 `type`/`typeVersion`을 그대로 쓴다. 노드 이름은 역할 명세의 표와 **글자까지 같게**(설계서 = JSON).

## 5. 파일 규칙
- 파일 하나 = 워크플로우 하나. `"settings": {"executionOrder": "v1", "errorWorkflow": "team3Errors00001"}`.
- `team3-errors.json`은 맨 위 `"id": "team3Errors00001"`. 다른 파일은 id를 쓰지 않는다(push가 파일 이름으로 정함).
- 키 · 토큰 · 연락처를 JSON · 문서 · 지시문에 쓰지 않는다. Credential id만.

## 6. 하지 말 것
- 공통 계약(요청·응답 칸, route 값)을 바꾸지 않는다.
- `cases/*.json`의 기대 결과를 테스트 통과용으로 바꾸지 않는다. 틀렸다고 생각되면 사람에게.
- 워크플로우 안에서 고장 스위치 · `*-reset` · `*-clear`를 부르지 않는다.
- 실패를 숨기지 않는다(실패 항목을 성공으로 바꾸지 않음). LLM이 멈추면 자동 답변하지 않고 이관(fail-closed).
- n8n 컨테이너 · `~/day65-n8n` · Credential을 만들거나 지우지 않는다. `.env` · 키를 출력하지 않는다.
