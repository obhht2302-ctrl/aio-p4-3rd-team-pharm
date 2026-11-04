# 약국 업무 도우미 화면

화면 명세: [`specs/06-screen.md`](../specs/06-screen.md). 질문하기, 내 문의, 약사 화면을 Next.js 정적 내보내기로 제공합니다. 화면은 FastAPI만 호출하며 키와 웹훅 주소를 포함하지 않습니다.

## 설치와 실행

Node.js 20.9 이상이 필요합니다. 이 폴더에서 실행하세요.

```powershell
$env:npm_config_cache = (Join-Path (Get-Location) '.npm-cache')
npm install
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev -- --port 3100
```

브라우저에서 `http://localhost:3100`을 엽니다. 빌드를 확인할 때는 개발 서버를 `Ctrl+C`로 종료한 뒤 `npm run build`와 `npm run check`를 실행하세요.

기본 캐시 권한 오류를 피하려고 프로젝트 내부 `.npm-cache/`를 사용합니다. 설치된 버전은 `package-lock.json`에 고정돼 있습니다. Motion, lucide-react, sonner, Pretendard, Tailwind CSS 4와 shadcn UI 부품을 사용합니다. 글꼴은 `next/font/local`로 패키지의 WOFF2 파일을 불러옵니다.

기본값은 계약 예시를 사용하는 연습 모드입니다. 실제 API를 연결할 때는 `.env.local`에 다음을 설정하고 개발 서버를 다시 시작하세요.

```text
NEXT_PUBLIC_API_MODE=real
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

API는 기본으로 `http://localhost:3000`만 허용합니다. 화면을 3100번으로 켜면 API를 켤 때 `CORS_ORIGINS=http://localhost:3100`을 함께 지정하세요 (`infra/.env`를 쓰면 그 파일에). `NEXT_PUBLIC_*` 값은 빌드할 때 들어가므로, 바꾸면 다시 빌드합니다.

`npm run build`의 결과는 `web/out/`에 생기고, `infra/compose.team3.yml`의 nginx가 이 폴더를 보여 줍니다.

## 해든 작업 범위와 목데이터

해든이 질문하기, 내 문의, 약사 화면과 공통 디자인을 구현했습니다. 변경한 화면 코드의 맨 위에는 담당 이름과 작업 내용을 주석으로 남겼습니다. `components/ui/`는 shadcn 명령으로 생성한 공통 부품입니다.

연습 모드는 계약 예시의 마감 질문에 근거가 있는 답을 보여 줍니다. 어르신 예시의 세 번째 질문인 “혈압약이랑 관절약 같이 먹어도 돼요?”는 화면 점검용 목데이터이며, 보완 질문 → 이어서 답하기 → 약사 접수를 확인할 수 있습니다. 그 밖의 질문은 답변 자료가 없는 접수 건으로 기록합니다. 연습 중의 질문과 티켓 상태는 현재 브라우저 탭의 `sessionStorage`에 저장됩니다. 실제 API 연결 검증은 API와 n8n이 준비된 뒤 진행해야 합니다.

## 화면 점검

개발 서버를 `npm run dev -- --port 3100`으로 켜고, 다른 PowerShell 창의 `web/`에서 다음을 실행합니다. 브라우저를 새 세션으로 열어 세 화면과 사용자 역할, 375px 너비를 점검합니다.

```powershell
$env:npm_config_cache = (Join-Path (Get-Location) '.npm-cache')
npx --yes --package @playwright/cli playwright-cli -s=haedeun_smoke open http://localhost:3100
npx --yes --package @playwright/cli playwright-cli -s=haedeun_smoke run-code --filename tests/mock-screen-smoke.js
npx --yes --package @playwright/cli playwright-cli -s=haedeun_smoke close
```

375px 화면 캡처는 `../docs/images/screen-{ask,my,admin}-375.png`에 있습니다. 캡처의 이름과 연락처는 가렸습니다.
