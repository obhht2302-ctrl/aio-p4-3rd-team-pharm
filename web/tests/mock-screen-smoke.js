// 해든: 목데이터로 질문하기 → 내 문의 → 약사 처리까지 세 화면의 주요 흐름을 검증합니다.
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
  const code = `mock-${Math.random().toString(36).slice(2)}`;
  const login = async (name) => {
    await page.goto(origin + "/");
    const change = page.getByRole("button", { name: "사용자 바꾸기" });
    if (name !== "김하늘") {
      await change.waitFor({ state: "visible" });
      await change.click();
    }
    await page.getByRole("combobox", { name: "사용자" }).waitFor({ state: "visible" });
    await page.getByRole("combobox", { name: "사용자" }).selectOption(name);
    await page.getByRole("textbox", { name: "입장 코드" }).fill(code);
    await page.getByRole("button", { name: "들어가기" }).click();
    await page.getByRole("textbox", { name: "질문 내용" }).waitFor({ state: "visible" });
    verify(await page.getByRole("textbox", { name: "질문 내용" }).isVisible(), `${name}: 질문 화면 입장`);
  };

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(origin + "/");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "들어가기" }).click();
  verify(await page.getByRole("alert").getByText("사용자와 입장 코드를 넣어 주세요.").isVisible(), "입장 정보 누락 안내");
  await width("입장 화면");

  await login("김하늘");
  const example = "마감 때 계산대 현금은 어떤 순서로 맞춰요?";
  await page.getByRole("textbox", { name: "질문 내용" }).fill(example);
  await page.getByRole("button", { name: "질문 보내기" }).click();
  await page.getByText("자동 답변", { exact: true }).first().waitFor({ state: "visible" });
  verify(await page.getByText("자동 답변", { exact: true }).isVisible(), "계약 예시 자동 답변");
  verify(await page.getByText(/closing-checklist/).isVisible(), "답변 근거 문서 표시");
  await width("질문 답변 화면");
  await page.goto(origin + "/my/");
  await page.locator(".mobile-cards").getByText(example, { exact: true }).first().waitFor({ state: "visible" });
  verify(await page.getByText(example, { exact: true }).count() > 0, "질문 후 내 문의 저장");
  verify(await page.getByText(/T-2003/).count() > 0, "기존 이관 티켓 표시");
  await width("내 문의 화면");
  await page.goto(origin + "/admin/");
  await page.getByRole("heading", { name: "접근할 수 없어요" }).waitFor({ state: "visible" });
  verify(await page.getByRole("heading", { name: "접근할 수 없어요" }).isVisible(), "직원 약사 화면 제한");
  verify(await page.getByText("OTC-03 회수 제품 진열 중").count() === 0, "권한 없을 때 목록 숨김");
  await width("접근 제한 화면");

  await login("이서준");
  await page.goto(origin + "/admin/");
  await page.getByText("OTC-03 회수 제품 진열 중").waitFor({ state: "visible" });
  verify(await page.getByText("OTC-03 회수 제품 진열 중").isVisible(), "약사 긴급 티켓 표시");
  verify(await page.getByRole("button", { name: "손님 안내 보내기 (연습)" }).count() === 1, "약사 회수 안내 버튼");
  await page.getByRole("button", { name: "처리 중" }).first().click();
  await page.reload();
  await page.getByRole("button", { name: "처리 중" }).first().waitFor({ state: "visible" });
  verify(await page.getByRole("button", { name: "처리 중" }).first().isDisabled(), "티켓 상태 새로고침 유지");
  await page.getByRole("button", { name: "손님 안내 보내기 (연습)" }).click();
  const notice = page.locator(".notice-result");
  await notice.waitFor({ state: "visible" });
  verify(await notice.getByText("연습 기록 · 실제 발송 없음").isVisible(), "회수 안내는 연습 기록");
  verify((await notice.textContent()).includes("010-****-"), "연락처 가림 표시");
  verify(!(await notice.textContent()).includes("OTC-03"), "연락처와 약 이름 분리");
  await width("약사 화면");

  await login("정민재");
  await page.goto(origin + "/admin/");
  await page.getByText("OTC-03 회수 제품 진열 중").waitFor({ state: "visible" });
  verify(await page.getByText("OTC-03 회수 제품 진열 중").isVisible(), "약국장 티켓 조회");
  verify(await page.getByRole("button", { name: "손님 안내 보내기 (연습)" }).count() === 0, "약국장 회수 안내 제한");

  await login("최영순");
  const followup = "혈압약이랑 관절약 같이 먹어도 돼요?";
  await page.getByRole("button", { name: followup }).waitFor({ state: "visible" });
  verify(await page.getByRole("button", { name: followup }).isVisible(), "어르신 예시 3개 중 보완 질문");
  verify(await page.locator(".example-button").count() === 3, "어르신 예시 버튼 3개");
  const seniorSize = await page.evaluate(() => ({
    font: parseFloat(getComputedStyle(document.querySelector(".senior .page-description")).fontSize),
    buttons: [...document.querySelectorAll(".senior button")].map(button => button.getBoundingClientRect().height),
  }));
  verify(seniorSize.font >= 18 && seniorSize.buttons.every(height => height >= 48), "어르신 글씨 18px·버튼 48px");
  await page.getByRole("button", { name: followup }).click();
  await page.getByText("보완 질문", { exact: true }).waitFor({ state: "visible" });
  verify(await page.getByText("보완 질문", { exact: true }).isVisible(), "보완 질문 경로");
  await page.getByRole("textbox", { name: "조금 더 알려 주세요" }).fill("암로디핀과 이부프로펜");
  await page.getByRole("button", { name: /이어서 답하기/ }).click();
  await page.getByText("담당자 이관", { exact: true }).waitFor({ state: "visible" });
  verify(await page.getByText("담당자 이관", { exact: true }).isVisible(), "보완 후 담당자 이관");
  verify(await page.getByText(/담당자 접수 번호/).isVisible(), "보완 후 접수 번호");
  const ticketId = (await page.getByText(/담당자 접수 번호/).textContent()).match(/T-MOCK-[\w-]+/)?.[0];
  verify(Boolean(ticketId), "보완 후 목 티켓 번호 생성");
  verify(await page.getByText(/AI가 공공 의약품 정보를 정리한 안내예요/).isVisible(), "어르신 답 끝 AI 고지");
  await width("어르신 질문 화면");
  await page.goto(origin + "/my/");
  await page.locator(".mobile-cards").getByText(followup, { exact: true }).first().waitFor({ state: "visible" });
  verify(await page.getByText(followup, { exact: true }).count() > 0, "어르신 질문 내 문의 기록");
  verify(await page.getByText(example, { exact: true }).count() === 0, "다른 사용자 문의 숨김");
  await page.setViewportSize({ width: 1280, height: 900 });
  verify(await page.locator(".desktop-table").isVisible(), "데스크톱 문의 표 표시");
  verify(!(await page.locator(".mobile-cards").isVisible()), "데스크톱에서 모바일 카드 숨김");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(origin + "/admin/");
  await page.getByRole("heading", { name: "접근할 수 없어요" }).waitFor({ state: "visible" });
  verify(await page.getByRole("heading", { name: "접근할 수 없어요" }).isVisible(), "환자 약사 화면 제한");
  await width("환자 접근 제한 화면");

  await login("이서준");
  await page.goto(origin + "/admin/");
  await page.getByText(ticketId, { exact: true }).waitFor({ state: "visible" });
  verify(await page.getByText(ticketId, { exact: true }).isVisible(), "보완 질문 티켓이 약사 목록에 표시");
  await page.getByRole("tab", { name: "긴급" }).click();
  await page.getByText(ticketId, { exact: true }).waitFor({ state: "hidden" });
  verify(await page.getByText("OTC-03 회수 제품 진열 중").isVisible(), "긴급 탭은 긴급 티켓만 표시");
  await page.getByRole("tab", { name: "전체" }).click();
  await page.getByText(ticketId, { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "처리 완료" }).first().click();
  await page.getByRole("tab", { name: "처리할 일" }).click();
  await page.getByText("OTC-03 회수 제품 진열 중").waitFor({ state: "hidden" });
  verify(await page.getByText(ticketId, { exact: true }).isVisible(), "완료 티켓 제외·미완료 티켓 유지");
  await width("티켓 필터 화면");

  return checks;
}
