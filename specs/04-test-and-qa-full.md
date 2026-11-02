# 04 · 시험 · 품질 + 화면 QA 명세 (완전체본) — `cases/` · `runs/` · 실행 결과서 · 화면 QA

> 설계판으로 직접 해 봐도 되고, 완전체본을 그대로 에이전트에 던져도 돼요. 설계판으로 하다가 막히면 완전체본의 같은 절을 보세요. (설계판: [`04-test-and-qa.md`](04-test-and-qa.md))

- 맡은 사람: 해든 (직접 하고, 막히면 태웅 · 다영이 도와줌) · 마감: 11/5(목) · 별 ★★☆
- 과제 한 문장: **공통 14유형 · 팀 시나리오로 매번 회귀를 돌려 `runs/`에 증거를 남기고, 그 숫자로만 실행 결과서를 쓰고, 태웅이 만든 화면을 써 보고 고칠 점을 낸다.**
- 산출물: 실행 결과서 (제안 배점 25) 전부, `runs/` 보고서, 화면 QA 점검표.

| 이 역할이 정하는 것 | 바꾸면 안 되는 것 |
| --- | --- |
| 공통 시나리오 **질문 문장** (11/5 14:00 점검 전까지, 리드와), 팀 시나리오 추가 · 문장, 시연 요청 파일, 실패 사례로 무엇을 쓸지, 화면 QA 의견 | 공통 14개 ID · 판정 칸 · `before/after`, **기대를 먼저 쓰고 결과에 맞춰 고치지 않기**, 숫자는 `runs/`에서만, 반복 3회 · `bench -n 5` 상한 (강사 키 공유) |

## 0. 시작 전

**가짜 먼저, 준비되면 바꿔 끼우기** — 계약이 먼저 고정돼 있어서 오늘부터 바로 시작합니다. 남의 부품이 없으면 `contracts/examples/`의 예시를 그대로 쓰는 가짜로 대신하고, 진짜가 준비되면 스위치 한 곳만 바꿉니다. 완료 목표는 11/5(목) 하나입니다.

| 바로 할 수 있는 것 | 남의 것이 필요한 것 | 그동안 쓰는 가짜 (`contracts/examples/`) | 바꿔 끼우는 법 |
| --- | --- | --- | --- |
| 시나리오 · 기대값 검토, 시험 실행 스크립트, 결과서 틀, 지식 문서 · 데이터 검수 | 다영 본체 골격, 태웅 화면 | 응답 모양 = `support.json`의 `responses` (판정 칸 확인용), 화면 QA는 가짜 응답 모드로 먼저 | 골격이 올라오면 공통 실행 (400 · 차단은 골격만으로 통과), `SEARCH` · `HANDOFF`가 `real`이 되면 전체 |

⏳ **진짜를 기다려야 하는 것**: 공통 14유형 전체 통과 · LLM 3회 반복 · `bench` (본체 + 하위 연결 뒤), **실행 결과서 숫자** (샘 일정대로 11/6~11/9 VM에서 다시 잼 — 미리 잰 숫자는 결과서에 쓰지 않음).

- 읽을 것: `00-DESIGN.md` 7절, 샘 `07-TESTING-GUIDE.md` · `03-SCENARIOS-AND-DATA.md` 4 · 5절 · `templates/EXECUTION-RESULT-TEMPLATE.md`.
- 시나리오 원본: 공통 = `cases/common.json` (직접 고침, 바꾸면 리드가 `packs.py lock`), 팀 = `packs/<팩>/cases.json` (빌드하면 `cases/team.json`). `cases/team.json`을 직접 고치면 다음 build 때 사라집니다.
- 판정 칸 (77판 `flow.py`): `equals` · `contains` (목록이면 하나라도) · `not_contains` · `range` (`[최소, 최대]`) · `status` · `max_seconds`. 점으로 내려감 (`ticket.priority`).

## 1. 시나리오 검토 (가장 먼저)

| 볼 것 | 방법 |
| --- | --- |
| 공통 14유형이 샘 03 문서 4절 판정과 같은가 | 표 한 줄씩 대조. 우리 것은 질문만 다르고 판정은 같아야 함. WF-05는 샘이 `권한 없음 또는 담당자 이관`을 허용해서 `contains route [둘 다]` |
| 질문이 우리 문서로 답이 되나 | `knowledge/` 문서와 기대 `sources`를 대조 (WF-01 → `closing-checklist`, WF-12 → `recall-first-response`) |
| 팀 시나리오가 샘 5종류를 덮나 | 정상 (T-01 · T-31) · 경계 (T-02 · T-32) · 지나치게 막지 않음 (T-07) · 우리가 더한 문서 (T-04 · T-07) · 우리 설계의 예외 (T-03 · T-06 · T-33 · T-34) + 숨긴 공격 (T-05) |
| 어르신 규칙이 시나리오로 있나 | T-32 (보완 질문) · T-33 (병용금기에 없어도 약사 확인) · T-34 (위험 신호) |
| 80일차 키트가 나오면 | 키트 `cases/common.json`의 판정 키와 대조해 다른 곳을 리드에게 (특히 WF-05 · 07 · 10 · 12) |

고칠 게 있으면 **기대부터** 고치고 (결과를 보기 전에), 공통은 리드에게 말해 `lock`을 다시 받습니다.

## 2. 시험 돌리기

### 2.1 시험 실행 스크립트 (`tools/run_tests.sh`, 직접 만듦)

```bash
#!/usr/bin/env bash
# 사용: tools/run_tests.sh [common|team|all] [반복 수]   — 샘 키트 폴더에서 flow.py를 부름
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
KIT="${KIT:-$HOME/aio-01d4-stu/Last3Mon/77}"          # 80일차 키트가 나오면 Last3Mon/80
WHICH="${1:-all}"; REPEAT="${2:-1}"
cd "$KIT"
uv run tools/flow.py fault all ok && uv run tools/flow.py llm up
uv run tools/flow.py call team3-index "$REPO/requests/empty.json" >/dev/null   # push 뒤 색인이 비어 있을 수 있음
[[ "$WHICH" != team ]]   && uv run tools/flow.py test "$REPO/cases/common.json" --webhook team3-support --repeat "$REPEAT" -v
[[ "$WHICH" != common ]] && uv run tools/flow.py test "$REPO/cases/team.json" --repeat "$REPEAT" -v
cp -n "$KIT"/runs/*.json "$REPO/runs/" 2>/dev/null || true                  # 보고서를 팀 레포로
uv run tools/flow.py fault all ok && uv run tools/flow.py llm up            # 꼭 되돌림
```

- `FLOW_WEBHOOK_KEY`는 실행 전에 `export` (값은 팀장에게, 파일에 쓰지 않음).
- 보고서는 `runs/<시나리오 파일>-<시각>.json`. **결과서 숫자의 유일한 근거**입니다.

### 2.2 언제 무엇을

| 언제 | 무엇을 | 남길 것 |
| --- | --- | --- |
| 다영 골격이 올라오면 | `run_tests.sh common` 한 번 | 출발점 통과 수 (`docs/daily/`에) |
| 기능이 붙을 때마다 | 그 기능 시나리오 + 공통 전부 (회귀) | 깨지면 깨뜨린 사람에게 `runs/` 파일 경로로 |
| 팀장이 VM에 배포할 때마다 | VM에서 공통 전부 | VM 통과 수 |
| 11/6 8교시 (동결) | 공통 + 장애 | 통과 수 → 리드 (7개 미만이면 가산 중단) |
| 11/9 오전 (동결 뒤) | 전부 `--repeat 3` + `bench team3-support requests/wf01.json -n 5` + `flow.py ops` | 결과서 최종 숫자 |

- 장애 시나리오(WF-04 · 10 · 11)는 시나리오 파일의 `before/after`가 켜고 끕니다. 중간에 멈췄으면 손으로 `fault all ok` · `llm up`. 같은 n8n을 팀원이 쓰는 중이면 미리 말하고.
- 3회 중 2회 통과는 통과가 아닙니다. 흔들린 케이스는 원인(LLM 판단 · 시간 초과 · 외부 지연)을 적고 같은 조건으로 다시 돌려 둘 다 남깁니다.

## 3. 실패 사례 만들기 (2건 이상)

일부러 깨고 고친 기록이 가장 좋은 증거입니다 (샘 07 문서 5절).

| 후보 | 깨는 법 | 기대 증거 |
| --- | --- | --- |
| 검색 뒤 권한 거르기 | (연습 브랜치에서) search가 owner 키도 늘 보게 → WF-05에 `mgr-owner-rules`가 나옴 | 고치기 전 · 뒤 `runs/` 두 개 |
| 멱등 키 빠짐 | handoff의 `key`를 빼고 WF-09 | 티켓 2건 → 1건 |
| 어르신 금지 문장 | `Check answer` 금지 문장 검사를 끄고 T-33 | "드셔도 돼요"가 나오는지 → 검사 켜고 0 |
| Error Workflow | 본체 Code에 `throw` | `alerts/latest` critical + DLQ 1 |

현상 · 재현 조건 · 원인 (근거) · 조치 · 재시험 · 잔여 위험 6칸으로 씁니다.

## 4. 실행 결과서 (`docs/EXECUTION-RESULT.md`)

| 절 | 채울 것 | 어디서 |
| --- | --- | --- |
| 1 시나리오별 기록 | 공통 14 + 팀 11: 입력 · 기대 · 실제 · 지나간 역할(`agents`) · 시간 · 3회 판정 · 보고서 파일 | `runs/*.json`의 `results` |
| 2 실행 로그 대표 3건 | 정상 (WF-01) · 예외 (WF-04) · 이관 (WF-12) | n8n Executions 화면 캡처 (개인정보 가림) + data-api `/logs` |
| 3 결과 요약 | 전체 · 성공 / 실패 · 자동 답변 / 이관 · p50 · p95 · 예외 처리 성공률 · 근거 없는 답변 0 · 권한 위반 0 · 요청당 LLM 호출 | `runs/`, `bench`, `agents` 길이 |
| 4 실패 사례 | 3절 2건 이상 | `runs/` 고치기 전 · 뒤 |
| 5 시연 준비 | 시연 순서 7단계와 요청 파일 (`requests/demo-01~05`, `recall-announce`) | 리드와 |
| 6 체크리스트 | 샘 KSM-REQ 6절 15개 그대로 | — |

- 칸마다 `runs/<파일>` 이름을 붙입니다. 보고서에 없는 숫자는 빈칸 + "없음".
- 결과서 숫자와 `runs/`가 다르면 감점입니다 (샘 00 문서 5절).

## 5. 화면 QA (태웅 화면이 나오면 — 가짜 응답 모드로 먼저)

태웅이 만든 `web/` 화면 3개를 **실제로 써 보고** 고칠 점을 냅니다. 다영도 같이 봅니다.

| 화면 | 점검 | 기대 |
| --- | --- | --- |
| `/` 질문하기 | 사용자 선택 + 입장 코드 없이 질문이 보내지나 | 안 보내짐, 짧은 안내 |
| `/` | 직원으로 WF-01 질문 | 답 + 근거 문서 이름이 보임 |
| `/` | 환자(최영순)로 들어가면 어르신 약 질문 예시 버튼이 보이나, 글씨가 큰가 | 보임, 읽기 쉬움 |
| `/` | 어르신 답 끝에 AI 고지가 보이나 | "AI가 공공 의약품 정보를 정리한 안내예요…" |
| `/` | 보완 질문이면 답을 이어서 보낼 수 있나 | 같은 화면에서 `context`로 다시 보냄 (새 요청 번호) |
| `/my` 내 문의 | 내 질문만 보이나, 이관 건 상태가 보이나 | 남의 건 0 |
| `/admin` | 직원 · 환자로 들어가면 | 막힘 (주소를 직접 쳐도) |
| `/admin` | 약사로 회수 공표 알림 → 티켓 → "손님 안내 보내기" | 동의한 손님만, 연락처 가림, "연습 기록" 표시, 약 이름 없음 |
| 모든 화면 | 휴대폰 폭 (DevTools 375px) | 가로 스크롤 없음 |
| 모든 화면 | API가 꺼졌을 때 | 멈추지 않고 짧은 오류 문장 |

- 의견 내는 법: **디코에 올리거나 태웅에게 직접.** 한 의견 = 화면 · 한 일 · 기대 · 실제 · 캡처 (이름 · 연락처 가림) 한 묶음.
- 점검 결과(통과 · 실패)는 `docs/qa/screen-qa.md`에 위 표를 복사해 체크합니다.

## 6. 지식 문서 · 데이터 검수 (기다리는 동안)

- `data/users.json` · `records.json` · `customers.json`이 전부 가짜인지 (`010-0000-xxxx`, `@example.com`), 접수 건 주인이 서로 다른지.
- 시나리오가 기대하는 문서 · 접수 번호 · 사용자가 데이터에 있는지 (`python3 tools/packs.py check`가 문서는 확인함).
- 문서 문장이 이상하면 영민에게 (문서 원본은 영민 담당).

## 7. 완료 기준

- 먼저 (가짜로 됨): 1절 검토 끝 (고칠 점은 리드에게), `tools/run_tests.sh` 커밋, `docs/EXECUTION-RESULT.md` 틀 (1절 표에 시나리오 31줄 미리).
- 본체 골격 · 화면이 올라오면: 공통 첫 실행 보고서 `runs/` 커밋, 화면 QA 1회 + 의견 전달. 목표는 11/5(목)까지.
- 11/9 14:50 전: 결과서 1~6절, 숫자마다 `runs/` 파일 이름, 기억 · 예상으로 채운 칸 0.

## 8. 막혔을 때

| 증상 | 할 일 |
| --- | --- |
| `before` 단계 실패 | data-api가 77판 이상인지 (`/cache-clear` · `/alerts-clear`가 있어야 함), 우리 compose의 data-api인지 |
| 장애 시나리오 뒤 다른 게 실패 | `fault all ok` · `llm up` |
| 전부 검색 결과 없음 | push 뒤 재색인 안 함 → `call team3-index` |
| 결과가 매번 다름 | 판정을 계약 칸(`route` · `sources`)으로 보고 있는지, `--repeat 3`으로 재고 결과서에 |

## 9. 금지

- 통과시키려고 기대 바꾸기, 결과에 맞춰 팀 시나리오 고치기, 숫자 반올림 · 추정, 장애를 켜 두고 퇴근, 캡처에 연락처 · 키 노출, 서브에이전트 · `/review`.

## 10. 에이전트 요청문 (복붙)

```text
AGENTS.md, 00-DESIGN.md 7절, specs/04-test-and-qa-full.md, 샘 07-TESTING-GUIDE.md 를 읽고 다음을 해 줘.
1) cases/common.json 과 cases/team.json 을 샘 03 문서 4·5절과 대조해서 판정이 약해진 곳 · 문서와 안 맞는 곳을 표로 짚어 줘 (고치지는 말고).
2) tools/run_tests.sh 를 2.1절 그대로 만들고 chmod +x.
3) docs/EXECUTION-RESULT.md 1절 표에 공통 · 팀 시나리오 줄을 미리 만들어 둬 (실제 칸은 비움).
4) runs/ 에 보고서가 있으면 1 · 3절 숫자를 채우고 칸마다 보고서 파일 이름을 붙여. 보고서에 없는 숫자는 "없음".
```
