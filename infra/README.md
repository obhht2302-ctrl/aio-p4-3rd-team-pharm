# infra · 조합 C 한 벌 띄우기

| 서비스 | 하는 일 | n8n 안에서 부르는 주소 | 터미널에서 |
| --- | --- | --- | --- |
| `data-api` | 샘 77판 `server.py` + **우리** `data/` · `knowledge/` (티켓 · 알림 · DLQ · 고장 스위치는 샘 것 그대로) | `http://data-api:8800` | `http://localhost:8800` |
| `api` | FastAPI (`api/`) — 화면 뒷단, 약사 화면 티켓 | `http://api:8000` | `http://localhost:8000` |
| `web` | `web/out/` 정적 화면 (nginx) | — | `http://localhost:3000` |
| `db` | PostgreSQL (선택, `--profile db`) | `db:5432` | — |

## 노트북에서

```bash
# 1) 우리 파일 만들기
cd ~/aio-p4-3rd-team-pharm && python3 tools/packs.py build && python3 tools/packs.py check
# 2) 팀 설정 (infra/.env, n8n Credential, data-api — 켜져 있던 샘 data-api는 스크립트가 멈춤). README '시작 전 준비' 4번
bash tools/setup.sh
# 3) api까지 띄우기 (화면은 web/에서 npm run build 를 먼저 해야 out/ 이 생김)
docker compose -f infra/compose.team3.yml --env-file infra/.env up -d data-api api
curl -s localhost:8800/docs | head -c 300   # 우리 문서 10개가 나와야 함
curl -s localhost:8000/health
```

- 샘 시나리오의 `before`(`/tickets-reset` · `/cache-clear` …)와 `flow.py fault`는 이 data-api에서도 그대로 됩니다.
- 문서 · 데이터를 고치면 `packs.py build` 뒤 `docker compose ... restart data-api` (파일을 그대로 읽어서 보통은 재시작 없이도 반영).
- 팀 VM 배포 순서는 `specs/05-lead.md` 4절 (주소 · 비밀번호는 여기에 쓰지 않음).

## 팀 VM (리드)

- 처음 한 번: `~/aio-01d4-stu`(샘 레포, data-api `server.py` · `llm` 장애 스크립트용)와 이 레포를 홈에 받고, `infra/.env`에 팀 키 · `OPENAI_API_KEY` · `TEAM3_ENTRY_CODE` · `CORS_ORIGINS=https://<VM 주소>` · `WEB_BIND=0.0.0.0` · `WEB_PORT=80` · `DATABASE_URL` · `DB_PASSWORD`를 넣고 `bash tools/setup.sh` (Jira · Slack Credential은 리드가 따로 넣음)
- 배포할 때마다: VM 밖에서 화면을 빌드해 `web/out/`에 넣고 (`NEXT_PUBLIC_API_MODE=real`, `NEXT_PUBLIC_API_BASE=https://<VM 주소>`), VM에서 `bash tools/deploy_vm.sh`
- 화면은 `https://<VM 주소>/`, n8n은 `:5678`. 화면의 `/api/`는 nginx가 FastAPI로 넘기므로 API 포트는 밖에 열지 않습니다.
- VM은 **실제 모드**로 올라갑니다 (긴급 · 실패 → Slack, 티켓 API 장애 · 예상 못한 오류 → Jira). 레포 파일은 연습 모드 그대로입니다.
