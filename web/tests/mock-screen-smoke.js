// 해든: 목데이터로 로그인 → 질문하기 → 내 문의 → 약사 처리 → 고객 화면까지 주요 흐름을 검증합니다.
async (page) => {
  page.setDefaultTimeout(10000);
  const origin = new URL(page.url()).origin;
  const checks = [];
  const verify = (condition, label) => {
    if (!condition) throw new Error(`실패: ${label}`);
    checks.push(label);
  };
  const width = async (label) => {
    const size = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
    verify(size.viewport === 375 && size.scroll <= 375, `${label}: 375px 가로 스크롤 없음`);
  };
  const roles = { "김하늘": "직원", "이서준": "책임 약사", "정민재": "약국장", "최영순": "고객" };
  const code = `mock-${Math.random().toString(36).slice(2)}`;
  const login = async (name) => {
    await page.goto(origin + "/");
    const out = page.getByRole("button", { name: /로그아웃|나가기/ });
    await page.getByRole("heading", { name: /사용자 선택|질문하기|무엇을 도와드릴까요/ }).first().waitFor({ state: "visible" });
    if (await out.count()) await out.click();
    await page.getByRole("button", { name: new RegExp(`^.*${roles[name]}`) }).first().click();
    await page.locator(".person-card", { hasText: name }).click();
    await page.getByRole("textbox", { name: "입장 코드" }).fill(code);
    await page.getByRole("button", { name: `${name} 님으로 들어가기` }).click();
    await page.getByRole("button", { name: /로그아웃|나가기/ }).waitFor({ state: "visible" });
    verify(true, `${name}: 입장`);
  };

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(origin + "/");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.getByRole("heading", { name: "사용자 선택" }).waitFor({ state: "visible" });
  await width("로그인 화면");
  await page.getByRole("button", { name: /직원/ }).click();
  await page.getByRole("button", { name: /님으로 들어가기/ }).click();
  verify(await page.getByRole("alert").getByText("입장 코드를 넣어 주세요.").isVisible(), "입장 코드 없이 못 들어감");

  await login("김하늘");
  verify(await page.getByRole("link", { name: "약사 화면" }).count() === 0, "직원 메뉴에 약사 화면 없음");
  const example = "마감 때 계산대 현금은 어떤 순서로 맞춰요?";
  await page.getByRole("textbox", { name: "질문 내용" }).fill(example);
  await page.getByRole("button", { name: "보내기", exact: true }).click();
  await page.getByText("자동 답변", { exact: true }).first().waitFor({ state: "visible" });
  verify(await page.getByText(/closing-checklist/).isVisible(), "답변 근거 문서 표시");
  await width("질문 답변 화면");
  await page.goto(origin + "/my/");
  await page.locator(".mobile-cards").getByText(example, { exact: true }).first().waitFor({ state: "visible" });
  verify(await page.getByText(/T-2003/).count() > 0, "기존 이관 티켓 표시");
  await width("내 문의 화면");
  await page.goto(origin + "/admin/");
  await page.getByRole("heading", { name: "약사 · 약국장 전용 화면입니다" }).waitFor({ state: "visible" });
  verify(await page.getByText("OTC-03 회수 제품 진열 중").count() === 0, "권한 없을 때 목록 숨김");
  await width("접근 제한 화면");

  await login("이서준");
  await page.goto(origin + "/admin/");
  await page.getByRole("button", { name: "접수 목록 보기" }).click();
  await page.getByRole("button", { name: "OTC-03 회수 제품 진열 중" }).click();
  await page.getByRole("button", { name: "손님 안내 보내기 (연습)" }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "처리 중", exact: true }).click();
  await page.getByRole("button", { name: "상태 저장" }).click();
  await page.getByText("상태를 저장했어요.").waitFor({ state: "visible" });
  verify(true, "티켓 상태 저장");
  await page.getByRole("button", { name: "손님 안내 보내기 (연습)" }).click();
  const notice = page.locator(".notice-result");
  await notice.waitFor({ state: "visible" });
  verify(await notice.getByText("연습 기록 · 실제 발송 없음").isVisible(), "회수 안내는 연습 기록");
  verify((await notice.textContent()).includes("010-****-"), "연락처 가림 표시");
  verify(!(await notice.textContent()).includes("OTC-03"), "연락처와 약 이름 분리");
  await width("약사 화면");

  await login("정민재");
  await page.goto(origin + "/admin/");
  await page.getByRole("button", { name: "접수 목록 보기" }).click();
  await page.getByRole("button", { name: "OTC-03 회수 제품 진열 중" }).click();
  await page.getByText("손님 안내는 약사 계정에서만").waitFor({ state: "visible" });
  verify(await page.getByRole("button", { name: "손님 안내 보내기 (연습)" }).count() === 0, "약국장 회수 안내 제한");

  await login("최영순");
  const followup = "혈압약이랑 관절약 같이 먹어도 돼요?";
  await page.getByRole("button", { name: new RegExp(followup) }).waitFor({ state: "visible" });
  verify(await page.locator(".example-button").count() === 3, "어르신 예시 버튼 3개");
  await page.waitForTimeout(500); // 버튼 글자 크기 전환이 끝난 뒤에 잽니다
  const seniorSize = await page.evaluate(() => ({
    tiny: [...document.querySelectorAll(".senior *")].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 18).map(e => e.textContent.slice(0, 20)),
    buttons: [...document.querySelectorAll(".senior button")].map(button => button.getBoundingClientRect().height),
  }));
  verify(seniorSize.tiny.length === 0 && seniorSize.buttons.every(height => height >= 48), `어르신 글씨 18px·버튼 48px ${seniorSize.tiny}`);
  await width("고객 화면");
  await page.getByRole("button", { name: new RegExp(followup) }).click();
  await page.getByText("보완 질문", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("textbox", { name: "조금 더 알려 주세요" }).fill("암로디핀과 이부프로펜");
  await page.getByRole("button", { name: /이어서 답하기/ }).click();
  await page.getByText("담당자 이관", { exact: true }).waitFor({ state: "visible" });
  const ticketId = (await page.getByText(/담당자 접수 번호/).textContent()).match(/T-MOCK-[\w-]+/)?.[0];
  verify(Boolean(ticketId), "보완 후 접수 번호");
  verify(await page.getByText(/AI가 공공 의약품 정보를 정리한 안내예요/).isVisible(), "어르신 답 끝 AI 고지");
  await width("고객 답 화면");
  await page.goto(origin + "/my/");
  await page.locator(".mobile-cards").getByText(followup, { exact: true }).first().waitFor({ state: "visible" });
  verify(await page.getByText(example, { exact: true }).count() === 0, "다른 사용자 문의 숨김");
  await page.setViewportSize({ width: 1280, height: 900 });
  verify(await page.locator(".desktop-table").isVisible(), "데스크톱 문의 표 표시");
  verify(!(await page.locator(".mobile-cards").isVisible()), "데스크톱에서 모바일 카드 숨김");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(origin + "/admin/");
  await page.getByRole("heading", { name: "약사 · 약국장 전용 화면입니다" }).waitFor({ state: "visible" });
  verify(true, "고객 약사 화면 제한");

  await login("이서준");
  await page.goto(origin + "/admin/");
  await page.getByRole("button", { name: "접수 목록 보기" }).click();
  await page.getByRole("cell", { name: ticketId }).waitFor({ state: "visible" });
  verify(true, "보완 질문 티켓이 약사 목록에 표시");
  await page.getByRole("tab", { name: /처리 중/ }).click();
  await page.getByRole("cell", { name: ticketId }).waitFor({ state: "hidden" });
  verify(await page.getByRole("button", { name: "OTC-03 회수 제품 진열 중" }).isVisible(), "상태 탭 거르기");
  await width("티켓 필터 화면");

  return checks;
}
