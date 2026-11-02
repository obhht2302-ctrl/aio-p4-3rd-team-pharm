# 계약 예시 (contracts/examples)

연결선마다 요청 · 응답 예시 한 벌입니다. **모든 가짜(n8n `Stub search` · `Stub handoff`, 화면 가짜 응답, pytest)는 이 파일을 그대로 씁니다.** 계약이 바뀌면 `00-DESIGN.md`와 이 파일부터 고칩니다 (리드 승인). `python3 tools/packs.py check`가 JSON이 읽히는지와 응답 칸이 다 있는지 봅니다.

| 파일 | 연결선 | 쓰는 곳 |
| --- | --- | --- |
| `support.json` | 밖 → `team3-support` (요청 1, 응답 route별 7, 400) | 해든 판정 확인, `api/` n8n 가짜 |
| `search.json` | `team3-support` → `team3-search` | 다영 `Stub search` (`response`), 영민 단독 시험 (`request`) |
| `handoff.json` | `team3-support` → `team3-handoff` (성공 · 중복 · tickets_down) | 다영 `Stub handoff` (`response_ok`), 병훈 단독 시험 (`request`) |
| `index.json` | `team3-index` | 영민 |
| `api.json` | 화면 · n8n → FastAPI (경로마다) | 태웅 화면 가짜 응답, 병훈 pytest |
