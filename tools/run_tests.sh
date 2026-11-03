#!/usr/bin/env bash
# 사용: tools/run_tests.sh [common|team|all] [반복 수]   — 샘 키트 폴더에서 flow.py를 부름
#   예) tools/run_tests.sh common          공통 한 번 (골격이 올라왔을 때 출발점)
#       tools/run_tests.sh all 3           공통 + 팀 3회 반복 (11/5 VM 측정)
#   키트 위치를 바꾸려면 KIT=~/aio-01d4-stu/Last3Mon/80 tools/run_tests.sh all
set -uo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
KIT="${KIT:-$HOME/aio-01d4-stu/Last3Mon/77}"          # 80일차 키트가 나오면 Last3Mon/80
WHICH="${1:-all}"; REPEAT="${2:-1}"
case "$WHICH" in common|team|all) ;; *) echo "사용: $0 [common|team|all] [반복 수]" >&2; exit 2 ;; esac
[[ -f "$KIT/tools/flow.py" ]] || { echo "샘 키트가 없어요: $KIT (KIT=<키트 폴더>로 지정)" >&2; exit 2; }
cd "$KIT" || exit 2

restore() { uv run tools/flow.py fault all ok >/dev/null; uv run tools/flow.py llm up >/dev/null; }
trap restore EXIT                                          # 시험이 실패하거나 Ctrl+C로 멈춰도 장애 스위치를 꼭 되돌림
restore
mark="$(mktemp)"                                           # 이번 실행에서 생긴 보고서만 고르는 기준 시각
uv run tools/flow.py call team3-index "$REPO/requests/empty.json" >/dev/null   # push 뒤 색인이 비어 있을 수 있음

rc=0
if [[ "$WHICH" != team ]]; then
  uv run tools/flow.py test "$REPO/cases/common.json" --webhook team3-support --repeat "$REPEAT" -v || rc=1
fi
if [[ "$WHICH" != common ]]; then
  uv run tools/flow.py test "$REPO/cases/team.json" --repeat "$REPEAT" -v || rc=1
fi

mkdir -p "$REPO/runs"                                      # 보고서를 팀 레포로 (키트의 다른 실습 보고서는 안 가져옴)
find runs -maxdepth 1 \( -name 'common-*.json' -o -name 'team-*.json' \) -newer "$mark" -exec cp {} "$REPO/runs/" \; -print
rm -f "$mark"
exit "$rc"
