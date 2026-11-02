#!/usr/bin/env bash
# 팀 설정 한 번에: infra/.env 만들기 → n8n Credential 등록 → data-api 켜기.
#   cd ~/aio-p4-3rd-team-pharm && bash tools/setup.sh
# 처음 실행하면 infra/.env 만 만들고 멈춥니다. 디코로 받은 키를 맨 위 두 줄에 붙여 넣고 한 번 더 실행하세요.
# 키가 바뀌면 infra/.env 를 고치고 다시 실행하면 됩니다 (같은 id로 덮어씀). infra/.env 는 git에 올라가지 않습니다.
# n8n 컨테이너 이름이 다르면 N8N_CONTAINER=<이름> bash tools/setup.sh (docker ps로 확인).
set -euo pipefail
cd "$(dirname "$0")/.."
env_file=infra/.env

if [ ! -f "$env_file" ]; then
  cp infra/.env.example "$env_file" && chmod 600 "$env_file"
  echo "infra/.env 를 만들었어요. 맨 위 TEAM3_KEY= (우리 조 OpenAI 키가 있으면 OPENAI_API_KEY= 도) 뒤에"
  echo "디코로 받은 값을 붙여 넣고 같은 명령을 한 번 더 실행하세요: bash tools/setup.sh"
  exit 1
fi

# "KEY=값   # 설명" 에서 값만 꺼냄 (따옴표 · 뒤 설명 지움)
value() { { grep -E "^$1=" "$env_file" || true; } | tail -1 | cut -d= -f2- \
  | sed -e 's/[[:space:]]#.*$//' -e 's/[[:space:]]*$//' -e 's/^["'\'']//' -e 's/["'\'']$//'; }

key="$(value TEAM3_KEY)"
if ! printf '%s' "$key" | grep -Eq '^[A-Za-z0-9_-]{16,}$'; then
  echo "infra/.env 의 TEAM3_KEY 가 비어 있거나 모양이 이상해요. 디코로 받은 팀 키를 붙여 넣으세요." >&2
  exit 1
fi
openai="$(value OPENAI_API_KEY)"
if [ -n "$openai" ] && ! printf '%s' "$openai" | grep -Eq '^[A-Za-z0-9_-]{20,}$'; then
  echo "infra/.env 의 OPENAI_API_KEY 모양이 이상해요 (비워 두면 수업 때 넣은 'OpenAI (.env)'를 그대로 씀)." >&2
  exit 1
fi

# 1) n8n Credential — 샘 65일차 register-credentials.sh 와 같은 방식 (고정 id로 만들거나 덮어씀)
container="${N8N_CONTAINER:-$(docker ps --filter label=com.docker.compose.project=day65-n8n \
  --filter label=com.docker.compose.service=n8n --format '{{.Names}}' | head -1)}"
if [ -z "$container" ] || ! docker inspect "$container" >/dev/null 2>&1; then
  echo "n8n이 꺼져 있어요. 먼저: cd ~/aio-01d4-stu/Last3Mon/65/n8n && docker compose start" >&2
  exit 1
fi
creds='{"id":"team3WebhookKey","name":"team3WebhookKey","type":"httpHeaderAuth","data":{"name":"X-Team-Key","value":"'"$key"'"}}'
creds="$creds"',{"id":"team3ApiKey0001","name":"team3ApiKey","type":"httpHeaderAuth","data":{"name":"X-Api-Key","value":"'"$key"'"}}'
names="team3WebhookKey · team3ApiKey"
if [ -n "$openai" ]; then
  creds="$creds"',{"id":"openAiCourse0001","name":"OpenAI (.env)","type":"openAiApi","data":{"apiKey":"'"$openai"'","url":"https://api.openai.com/v1"}}'
  names="$names · OpenAI (.env)"
fi
# JSON은 stdin으로 컨테이너 안 임시 파일에 넣고 바로 지움 (화면 · 로그에 키가 남지 않게)
printf '[%s]' "$creds" | docker exec -i "$container" sh -c \
  'cat > /tmp/team3-credentials.json && n8n import:credentials --input=/tmp/team3-credentials.json >/dev/null; s=$?; rm -f /tmp/team3-credentials.json; exit $s'
echo "✔ n8n Credential 등록: $names"

# 2) data-api — 샘 server.py에 우리 data · knowledge를 붙여 켬. 샘 data-api가 포트 8800을 쓰고 있으면 먼저 멈춤
sam="$(value SAM_DATA_API)"
[ -n "$sam" ] || sam="$(cd .. && pwd)/aio-01d4-stu/Last3Mon/77/data-api/server.py"   # 두 레포를 같은 폴더(홈)에 받았을 때
case "$sam" in "~"*) sam="$HOME${sam#\~}" ;; esac
if [ ! -f "$sam" ]; then
  echo "샘 data-api server.py를 못 찾았어요: $sam" >&2
  echo "→ cd ~/aio-01d4-stu && git pull 을 먼저 하거나, infra/.env 의 SAM_DATA_API= 에 server.py 경로를 적어 주세요." >&2
  exit 1
fi
other="$(docker ps --filter publish=8800 --filter label=com.docker.compose.service=data-api --format '{{.Names}}' | grep -v '^team3-pharm-' || true)"
if [ -n "$other" ]; then
  echo "포트 8800을 쓰던 샘 data-api를 멈춰요: $other (다시 켜려면 docker start $other)"
  docker stop $other >/dev/null
fi
SAM_DATA_API="$sam" docker compose -f infra/compose.team3.yml --env-file "$env_file" up -d data-api
echo "✔ data-api 켜짐 → http://localhost:8800/docs 에 우리 문서가 보이면 끝"
