# 다정약국 화면

화면 명세: [`specs/06-screen.md`](../specs/06-screen.md). 질문하기(`/`), 내 문의(`/my`), 약사 화면(`/admin`)을 Next.js 정적 내보내기로 제공합니다. 화면은 FastAPI만 호출하며 키와 웹훅 주소를 포함하지 않습니다.

- 들어가기: 역할 카드 → 사용자 선택 → 입장 코드. 코드는 들어갈 때 API로 바로 확인합니다.
- 고객(환자) 화면: `components/senior-ask.tsx`. 글씨 크기 3단계이고, 예시는 `/api/types`의 senior 값을 씁니다.
- 태블릿 틀: 마우스를 쓰는 폭 760px 이상 화면에서만 보이고, 내용은 틀 안에서 스크롤합니다. 실제 태블릿 · 휴대폰은 화면을 꽉 채웁니다.

## 설치와 실행

Node.js 20.9 이상이 필요합니다. 이 폴더에서 실행하세요.

```powershell
$env:npm_config_cache = (Join-Path (Get-Location) '.npm-cache')
npm install
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev -- --port 3100
```

브라우저에서 `http://localhost:3100`을 엽니다. 빌드를 확인할 때는 개발 서버를 `Ctrl+C`로 종료한 뒤 `npm run build`와 `npm run check`를 실행하세요.

기본 캐시 권한 오류를 피하려고 프로젝트 내부 `.npm-cache/`를 사용합니다. 설치된 버전은 `package-lock.json`에 고정돼 있습니다. Motion, lucide-react, sonner, Pretendard, Tailwind CSS 4와 shadcn UI 부품을 사용합니다. 본문 글꼴 Pretendard는 `next/font/local`로 패키지의 WOFF2 파일을 불러옵니다. 제목 글꼴 고운돋움은 `next/font/google`이 빌드할 때 받아 앱 안에 넣으므로, 빌드하는 PC는 인터넷이 돼야 합니다 (실행 중 외부 요청은 없습니다).

기본값은 계약 예시를 사용하는 연습 모드입니다. 실제 API를 연결할 때는 `.env.local`에 다음을 설정하고 개발 서버를 다시 시작하세요.

```text
NEXT_PUBLIC_API_MODE=real
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

API는 기본으로 `http://localhost:3000`만 허용합니다. 화면을 3100번으로 켜면 API를 켤 때 `CORS_ORIGINS=http://localhost:3100`을 함께 지정하세요 (`infra/.env`를 쓰면 그 파일에). `NEXT_PUBLIC_*` 값은 빌드할 때 들어가므로, 바꾸면 다시 빌드합니다.

`npm run build`의 결과는 `web/out/`에 생기고, `infra/compose.team3.yml`의 nginx가 이 폴더를 보여 줍니다.

## 해든 작업 범위와 목데이터

해든이 질문하기, 내 문의, 약사 화면과 공통 디자인을 구현했습니다. 변경한 화면 코드의 맨 위에는 담당 이름과 작업 내용을 주석으로 남겼습니다. `components/ui/`는 shadcn 명령으로 생성한 공통 부품입니다.

연습 모드는 계약 예시의 마감 질문에 근거가 있는 답을 보여 줍니다. 연습 모드의 어르신 예시 세 번째 질문 “혈압약이랑 관절약 같이 먹어도 돼요?”는 화면 점검용 목데이터이며 (실제 모드는 `/api/types` 값을 그대로 씁니다), 보완 질문 → 이어서 답하기 → 약사 접수를 확인할 수 있습니다. 그 밖의 질문은 답변 자료가 없는 접수 건으로 기록합니다. 연습 중의 질문과 티켓 상태는 현재 브라우저 탭의 `sessionStorage`에 저장됩니다. 실제 API 연결 검증은 API와 n8n이 준비된 뒤 진행해야 합니다.

## 화면 점검

개발 서버를 `npm run dev -- --port 3100`으로 켜고, 다른 PowerShell 창의 `web/`에서 다음을 실행합니다. 브라우저를 새 세션으로 열어 세 화면과 사용자 역할, 375px 너비를 점검합니다.

```powershell
$env:npm_config_cache = (Join-Path (Get-Location) '.npm-cache')
npx --yes --package @playwright/cli playwright-cli -s=haedeun_smoke open http://localhost:3100
npx --yes --package @playwright/cli playwright-cli -s=haedeun_smoke run-code --filename tests/mock-screen-smoke.js
npx --yes --package @playwright/cli playwright-cli -s=haedeun_smoke run-code --filename tests/voice-ask-smoke.js
npx --yes --package @playwright/cli playwright-cli -s=haedeun_smoke close
```

## 말로 묻기 (고객 화면 마이크)

고객(어르신) 화면 첫 화면에 큰 "말로 물어보기" 버튼이 있고, 답 화면의 "조금 더 알려 주세요" 칸에도 "말로 하기" 버튼이 있습니다.

- 브라우저에 들어 있는 음성 인식(`SpeechRecognition` · `webkitSpeechRecognition`, 한국어)을 씁니다. 키 · 서버가 필요 없고 크롬 · 사파리에서 됩니다. 지원하지 않는 브라우저(파이어폭스 등)에서는 버튼이 보이지 않습니다.
- 알아들은 문장을 크게 보여 주고 [이대로 물어보기] · [다시 말하기]를 고르게 합니다. 잘못 알아들은 채로 약 질문이 바로 가지 않게 하려는 것입니다.
- 말소리는 브라우저의 음성 인식 서비스(크롬은 Google, 사파리는 Apple)로 가서 글자로만 돌아옵니다. 연습용 기능이며, 실제 운영이라면 고객 동의나 자체 음성 인식이 필요합니다.
- 마이크는 https 주소(팀 VM)나 localhost에서만 켜집니다. 처음 누르면 브라우저가 마이크 허용을 묻습니다.
- `tests/voice-ask-smoke.js`는 가짜 음성 인식을 넣어 누르기 → 듣기 → 문장 표시 → 물어보기 → 보완 질문 → 말로 하기 → 이어서 답하기를 확인합니다 (연습 모드).

375px 화면 캡처는 `../docs/images/screen-{ask,my,admin}-375.png`에 있습니다. 캡처의 이름과 연락처는 가렸습니다.
