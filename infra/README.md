# infra · 조합 C 한 벌 띄우기

| 서비스 | 하는 일 | n8n 안에서 부르는 주소 | 터미널에서 |
| --- | --- | --- | --- |
| `data-api` | 샘 77판 `server.py` + **우리** `data/` · `knowledge/` (티켓 · 알림 · DLQ · 고장 스위치는 샘 것 그대로) | `http://data-api:8800` | `http://localhost:8800` |
| `api` | FastAPI (`api/`) — 화면 뒷단, 약사 화면 티켓 | `http://api:8000` | `http://localhost:8000` |
| `web` | `web/out/` 정적 화면 (nginx) | — | `http://localhost:3000` |
| `db` | PostgreSQL (선택, `--profile db`) | `db:5432` | — |

## 노트북에서

```bash
# 0) 샘 data-api가 켜져 있으면 끈다 (이름 data-api · 포트 8800이 겹침)
cd ~/aio-01d4-stu/Last3Mon/77/data-api && docker compose down
# 1) 우리 파일 만들기
cd ~/aio-p4-3rd-team-pharm && python3 tools/packs.py build && python3 tools/packs.py check
cp infra/.env.example infra/.env      # SAM_DATA_API 경로 · 키 값 채우기 (커밋 금지)
# 2) 띄우기 (화면은 web/에서 npm run build 를 먼저 해야 out/ 이 생김)
docker compose -f infra/compose.team3.yml --env-file infra/.env up -d data-api api
curl -s localhost:8800/docs | head -c 300   # 우리 문서 10개가 나와야 함
curl -s localhost:8000/health
```

- 샘 시나리오의 `before`(`/tickets-reset` · `/cache-clear` …)와 `flow.py fault`는 이 data-api에서도 그대로 됩니다.
- 문서 · 데이터를 고치면 `packs.py build` 뒤 `docker compose ... restart data-api` (파일을 그대로 읽어서 보통은 재시작 없이도 반영).
- 80일차 키트가 나오면 `SAM_DATA_API`를 80판으로 바꾸고, 팀 데이터 파일 이름이 다르면 `compose.team3.yml`의 `volumes`만 고칩니다 (키트 확인).
- 팀 VM 배포 순서는 `specs/05-lead.md` 4절 (주소 · 비밀번호는 여기에 쓰지 않음).
