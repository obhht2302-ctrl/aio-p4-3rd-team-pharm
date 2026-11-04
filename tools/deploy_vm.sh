#!/usr/bin/env bash
# 팀 VM 배포 (리드). VM의 레포 폴더에서: bash tools/deploy_vm.sh
#   1) main 받기  2) data-api · api · db · web 띄우기  3) 워크플로우를 '실제 모드'로 push  4) 색인
#   - 화면 web/out 은 VM 밖에서 빌드해 넣음 (NEXT_PUBLIC_API_MODE=real, NEXT_PUBLIC_API_BASE=https://<VM 주소>)
#   - 실제 모드 = Handoff settings · Error settings 의 mode 'real' → 긴급 · 실패는 Slack #support-alerts, 티켓 API 장애 · 예상 못한 오류는 Jira.
#     레포 파일은 연습 모드 그대로 두고, .deploy/ 에 바꾼 사본을 만들어 올림 (손님 문자 · 메일은 어떤 모드에서도 안 보냄)
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
python3 tools/packs.py check
SAM_DATA_API="${SAM_DATA_API:-$HOME/aio-01d4-stu/Last3Mon/77/data-api/server.py}" \
  docker compose -f infra/compose.team3.yml --env-file infra/.env --profile db up -d --build data-api api db web
mkdir -p .deploy
for f in workflows/team3-*.json; do
  sed "s/mode: 'practice'/mode: 'real'/" "$f" > ".deploy/$(basename "$f")"
done
grep -l "mode: 'real'" .deploy/team3-handoff.json .deploy/team3-errors.json >/dev/null
uv run tools/flow.py push .deploy/team3-*.json
uv run tools/flow.py call team3-index requests/empty.json >/dev/null && echo "✔ 색인 완료"
