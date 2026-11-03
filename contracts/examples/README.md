# 계약 예시 (contracts/examples)

연결선마다 요청 · 응답 예시 한 벌입니다. **모든 가짜(n8n 가짜 웹훅 `workflows/stubs/` 3개, 화면 가짜 응답, pytest)는 이 파일을 그대로 씁니다.** 이 파일을 바꾸면 가짜 웹훅 JSON 안의 예시도 같이 바꿉니다. 계약이 바뀌면 `00-DESIGN.md`와 이 파일부터 고칩니다 (리드 승인). `python3 tools/packs.py check`가 JSON이 읽히는지와 응답 칸이 다 있는지 봅니다.

| 파일 | 연결선 | 쓰는 곳 |
| --- | --- | --- |
| `support.json` | 밖 → `team3-support` (요청 1, 응답 route별 7, 400) | 시험 판정 확인 (태웅), 가짜 본체 `team3-support-stub` |
| `search.json` | `team3-support` → `team3-search` | 가짜 웹훅 `team3-search-stub` (`response`), 영민 단독 시험 (`request` = `requests/search-closing.json`) |
| `handoff.json` | `team3-support` → `team3-handoff` (성공 · 중복 · tickets_down) | 가짜 웹훅 `team3-handoff-stub` (`response_ok` · `simulate`로 나머지), 병훈 단독 시험 (`request` = `requests/handoff-recall.json`) |
| `index.json` | `team3-index` | 영민 |
| `api.json` | 화면 · n8n → FastAPI (경로마다) | 해든 화면 가짜 응답, 병훈 pytest |
