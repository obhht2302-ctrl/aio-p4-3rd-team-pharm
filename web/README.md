# web · 화면 3개 (Next.js 정적 내보내기)

명세는 [`../specs/06-screen.md`](../specs/06-screen.md). 설치 · 빌드는 이 폴더에서:

```bash
cp .env.example .env.local        # NEXT_PUBLIC_API_MODE=mock 이면 가짜 응답 (contracts/examples/api.json)
npm install && npm run dev        # http://localhost:3000
npm run build                     # out/ → VM에서는 nginx가 이 폴더를 보여 줌
```

`lib/contract-examples.json`은 `python3 tools/packs.py build`가 `contracts/examples/api.json`을 복사한 것이라 직접 고치지 않습니다.
