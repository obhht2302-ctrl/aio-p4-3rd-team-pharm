#!/usr/bin/env bash
# 사용: tools/run_tests.sh [common|team|all] [반복 수]   — 레포의 tools/flow.py(3팀판)로 돌림, 보고서는 레포 runs/
#   예) tools/run_tests.sh common          공통 한 번 (골격이 올라왔을 때 출발점)
#       tools/run_tests.sh all 3           공통 + 팀 3회 반복 (11/5 VM 측정)
#   n8n · data-api는 샘 설치 그대로 (N8N_CONTAINER · N8N_URL · SAM_LAST3MON 환경 변수로 바꿀 수 있음)
set -uo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
WHICH="${1:-all}"; REPEAT="${2:-1}"
case "$WHICH" in common|team|all) ;; *) echo "사용: $0 [common|team|all] [반복 수]" >&2; exit 2 ;; esac
cd "$REPO" || exit 2

restore() { uv run tools/flow.py fault all ok >/dev/null; uv run tools/flow.py llm up >/dev/null; }
trap restore EXIT                                          # 시험이 실패하거나 Ctrl+C로 멈춰도 장애 스위치를 꼭 되돌림
restore
uv run tools/flow.py call team3-index requests/empty.json >/dev/null   # push 뒤 색인이 비어 있을 수 있음

rc=0
if [[ "$WHICH" != team ]]; then
  uv run tools/flow.py test cases/common.json --webhook team3-support --repeat "$REPEAT" -v || rc=1
fi
if [[ "$WHICH" != common ]]; then
  uv run tools/flow.py test cases/team.json --repeat "$REPEAT" -v || rc=1
fi
exit "$rc"                                                 # 보고서는 runs/common-*.json · runs/team-*.json
