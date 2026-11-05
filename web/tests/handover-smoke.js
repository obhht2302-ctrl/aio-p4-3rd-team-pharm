// 약사 화면 퇴근 인수인계: 남기기 → 다시 들어와도 오늘 알림에 표시 → 확인했어요 (연습 모드)
async (page) => {
  page.setDefaultTimeout(10000);
  const origin = new URL(page.url()).origin;
  const checks = [];
  const verify = (ok, label) => { if (!ok) throw new Error("실패: " + label); checks.push(label); };
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(origin + "/admin/");
  const out = page.getByRole("button", { name: /로그아웃|나가기/ });
  await page.waitForTimeout(800);
  if (await out.count()) await out.click();
  await page.getByRole("button", { name: /책임 약사/ }).first().click();
  await page.locator(".person-card", { hasText: "이서준" }).click();
  await page.getByRole("textbox", { name: "입장 코드" }).fill("mock-handover");
  await page.getByRole("button", { name: "이서준 님으로 로그인" }).click();
  await page.goto(origin + "/admin/");
  await page.getByRole("button", { name: /인수인계/ }).first().click();
  await page.getByRole("heading", { name: "퇴근 인수인계" }).waitFor();
  verify(true, "4단계 인수인계 화면");
  const openLine = await page.locator(".handover-open b").innerText();
  verify(/열린 건 \d+개 자동 첨부/.test(openLine), openLine);
  await page.locator("#handover-note").fill("회수 건 손님 연락이 한 분 남았어요");
  await page.getByRole("button", { name: "인계 남기기" }).click();
  await page.locator(".handover-note").first().waitFor();
  verify(true, "남기면 같은 화면 위에 인계 카드");
  await page.reload();
  await page.locator(".handover-note").first().waitFor();
  const text = await page.locator(".handover-note").first().innerText();
  verify(text.includes("회수 건 손님 연락이 한 분 남았어요") && text.includes("이서준"), "다시 들어와도 오늘 알림에 인계 표시");
  await page.getByRole("button", { name: "확인했어요" }).first().click();
  await page.waitForTimeout(400);
  verify(await page.locator(".handover-note").count() === 0, "확인했어요 → 사라짐");
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  verify(scroll, "가로 스크롤 없음");
  return checks;
}
