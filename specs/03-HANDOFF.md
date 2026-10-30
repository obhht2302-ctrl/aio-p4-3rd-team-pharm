# 03 · 연동·안정성 명세 — `workflows/team3-handoff.json` + `workflows/team3-errors.json`

> 과제 본질 한 문장: **메인이 "넘겨"라고 하면 티켓을 멱등하게 만들고 알림을 보내며, 외부가 멈춰도 요청을 잃지 않고(DLQ) 200으로 답하는 이관 모듈 + 예상 못 한 오류의 마지막 그물.** 계약은 `../00-DESIGN.md` 3.1절. 가산 Jira·Slack 실연동은 **태웅 담당**(10/27 틀: `reference/bootcamp_p4_framework/`의 team3-ticket·team3-alert, Credential `jiraAio3Cloud001`·`slackAio3Bot0001`) — 이 역할은 연습용(데이터 API) 경로를 완성하고 `mode` 스위치 자리만 둔다.
> 규모 상한: handoff 노드 ≤14, errors 노드 ≤5. 고장 시나리오 4개(WF-04·09·10·11)와 Error Workflow 동작이 완료 기준. 설계서 5~7절(연동·페이로드·오류 처리 표)이 산출물.

## 0. 시작 전
- 읽을 것: `00-DESIGN.md` 3.1절, 샘 `06-RELIABILITY-AND-SECURITY.md`, `Last3Mon/76/AGENTS.md` 2~5절(데이터 API 76판 엔드포인트, 재시도·멱등 키·Error Trigger·DLQ·알림 검증 노드), `76/my-work/error-handler.json`·`intake.json`(있으면).
- 단위 프로젝트 판 데이터 API의 `X-Api-Key`(키트 확인) → Credential `dataApiKey`를 HTTP Request마다.

## 1. `team3-handoff.json` 노드 표
| 노드 이름 | 하는 일 |
|---|---|
| `Handoff webhook` (path `team3-handoff`, Header Auth) | 3.1절 요청 `{request_id,user,title,category,priority,reason,summary,mode?}` |
| `Handoff settings` (set) | `mode` 기본 `practice`(연습용). `real`이면 Jira/Slack 하위(태웅 틀) — **Switch 한 곳** |
| `Mask title` (code) | title·summary에서 전화·메일 가림(티켓 본문에도 개인정보 금지) |
| `Create ticket` (httpRequest `POST /tickets` `{key: request_id, title, requester: user, category, priority}` timeout 3000, retryOnFail maxTries 3 wait 300, onError continueRegularOutput) | 멱등 키 = request_id → WF-09 티켓 1건 |
| `Ticket ok?` (if) | 201/200 → `Notify`; 실패(5xx·timeout) → `Send to DLQ` |
| `Send to DLQ` (httpRequest `POST /dlq` `{items:[{item:{id: request_id, ...요청 요약(개인정보 없이)}, reason:"tickets_down", workflow:"team3-handoff"}]}` neverError) | 잃지 않기. 같은 id면 attempts +1 |
| `Alert` (httpRequest `POST /alerts` `{workflow:"team3-handoff", node, message, severity, reason}` neverError) | 성공 이관: `severity: priority==high ? "high" : "normal"`, reason `handoff`; 티켓 실패: `severity: "high"`, reason `tickets_down` |
| `Suppress repeat?` (code+if, 선택) | 같은 reason high 알림이 10분 안에 있으면(`POST /alerts/list {reason, within:600}`) 보내지 않음(76 Lab02 과제 2) — critical은 늘 보냄 |
| `Build handoff result` (code) → `Send handoff result` | `{ticket:{ticket_id,priority,duplicate}|null, reason:""|"tickets_down", dlq, alert, handoff_ms}` **항상 200** |
- 401·403은 재시도하지 않고 바로 DLQ+알림(`reason: auth_failed`). 최악 시간 = 3×3초+0.6초 < support의 timeout 8초 안에 들어오는지 확인해 설계서에 숫자로.

## 2. `team3-errors.json` 노드 표 (파일 맨 위 `"id": "team3Errors00001"`)
| 노드 이름 | 하는 일 |
|---|---|
| `On error` (errorTrigger v1) | n8n이 부름: `$json.workflow.name/id`, `$json.execution.id/lastNodeExecuted/error.message` |
| `Alert critical` (`POST /alerts` `{workflow, workflow_id, node: lastNodeExecuted, message: error.message 앞 200자, execution_id, severity:"critical", reason:"unexpected"}`) | 사람 알림 |
| `Park in DLQ` (`POST /dlq` `{items:[{item:{id: execution.id, workflow}, reason:"unexpected", workflow}]}`) | 흔적 |
- 모든 팀 워크플로우 `settings.errorWorkflow = "team3Errors00001"`. errors도 push(게시) 필수. 웹훅 500 응답 뒤 1~3초 늦게 돈다(시나리오 `sleep`).

## 3. 가산 (태웅) — 이 역할 범위 밖, 자리만
- `mode == "real"` 갈래: `Create ticket (Jira)` = HTTP Request `POST https://aio3-servicedesk.atlassian.net/rest/servicedeskapi/request` `{serviceDeskId:2, requestTypeId, requestFieldValues:{summary, description}}` Credential `jiraAio3Cloud001`; `Alert (Slack)` = Slack 노드 `#support-alerts` Credential `slackAio3Bot0001`. 실패하면 연습용 갈래로 자동 대체(10/27 틀 그대로). 키는 Credential에만, JSON·문서·캡처에 0.

## 4. 완료 기준
- `flow.py call team3-handoff requests/handoff-sample.json` → 201 티켓, 알림 1. 같은 요청 다시 → `duplicate: true`, 티켓 수 그대로.
- `flow.py fault tickets error` → 200, `ticket: null`, `reason: tickets_down`, `dlq: true`, 알림 high 1 (WF-04). `fault tickets flaky` → 재시도로 성공, 티켓 1건. `fault tickets slow` → support 쪽 timeout 안에서 `ticket: null`로 돌아옴(WF-11은 support가 접수 조회 쪽이지만 같은 스위치) → `fault all ok`.
- support의 Code에 `throw`를 넣어 일부러 깨면 2~3초 뒤 `/alerts/latest` severity critical + DLQ 1 (Error Workflow 증명, 결과서 실패 사례 재료).
- `flow.py ops`에 티켓·DLQ·알림이 맞게 보임. 설계서 5절(연습용→실제 운영 두 줄씩: Header Auth→OAuth, /tickets→Jira, /alerts→Slack, 오류 코드·한도), 6절(연결선 표, 실제 실행 값 복사·가림), 7절(오류 처리 표 WF-04·09·10·11·401·429) 채움.

## 5. 금지
- 워크플로우 안에서 고장 스위치·reset·clear 호출, `key` 없는 POST /tickets, 실패를 성공으로 바꾸기, 알림 폭주(실패마다 1건씩 말고 묶기/억제), 실제 계정 키를 JSON·문서에. 서브에이전트·`/review` 금지.

## 6. 코덱스 요청문 (복붙)
```
00-DESIGN.md 3.1절과 specs/03-HANDOFF.md 1·2절 노드 표를 읽고 workflows/team3-handoff.json과 team3-errors.json을 만들어 줘.
노드는 ~/aio-01d4-stu/Last3Mon/76/AGENTS.md 5절(재시도·멱등 키·Error Trigger·DLQ·알림)의 검증된 type/typeVersion만, 출발점은 76/my-work/error-handler.json(없으면 76/reference).
mode 스위치는 Handoff settings 한 곳에 두고 real 갈래는 빈 Set 노드(이름 Create ticket (Jira), Alert (Slack))로 자리만.
먼저 "어떤 실패가 어디로 가는지" 표를 보여 주고, flow.py check 통과 후 push 명령과 fault 연습 순서(error→flaky→slow→all ok)를 알려 줘. 완료 기준은 4절.
```
