// 약사 화면 퇴근 인수인계 (서버 저장): 남기기 → 로그아웃 → 다른 태블릿(새 browser context, localStorage 빈 상태)에서 로그인 → 오늘 알림에 보임 → 확인했어요 → 사라짐
// 연습 모드에서는 '서버' 저장소가 sessionStorage team3-mock이라, 새 context에는 그 서버 스냅숏만 넘기고 화면 저장소(localStorage)는 비운 채로 엽니다.
// 실제 모드(VM)에서는 같은 순서를 진짜 서버로 확인할 수 있습니다.
async (page) => {
  page.setDefaultTimeout(10000);
  const origin = new URL(page.url()).origin;
  const checks = [];
  const verify = (ok, label) => { if (!ok) throw new Error("실패: " + label); checks.push(label); };
  const note = "회수 건 손님 연락이 한 분 남았어요";
  const login = async (p) => {
    await p.goto(origin + "/admin/");
    const out = p.getByRole("button", { name: /로그아웃|나가기/ });
    await p.waitForTimeout(800);
    if (await out.count()) await out.click();
    await p.getByRole("button", { name: /책임 약사/ }).first().click();
    await p.locator(".person-card", { hasText: "이서준" }).click();
    await p.getByRole("textbox", { name: "입장 코드" }).fill("mock-handover");
    await p.getByRole("button", { name: "이서준 님으로 로그인" }).click();
    await p.goto(origin + "/admin/");
  };

  await page.setViewportSize({ width: 1024, height: 768 });
  await login(page);
  await page.getByRole("button", { name: /인수인계/ }).first().click();
  await page.getByRole("heading", { name: "퇴근 인수인계" }).waitFor();
  verify(true, "4단계 인수인계 화면");
  const openLine = await page.locator(".handover-open b").innerText();
  verify(/열린 건 \d+개 자동 첨부/.test(openLine), openLine);
  await page.locator("#handover-note").fill(note);
  await page.getByRole("button", { name: "인계 남기기" }).click();
  await page.locator(".handover-note").first().waitFor();
  verify(true, "남기면 같은 화면 위에 인계 카드");
  const local = await page.evaluate(() => Object.keys(localStorage).filter(key => /handover/i.test(key)));
  verify(local.length === 0, "태블릿(localStorage)에는 인계를 저장하지 않음");
  const server = await page.evaluate(() => sessionStorage.getItem("team3-mock"));
  await page.getByRole("button", { name: "로그아웃" }).click();
  await page.getByRole("heading", { name: "사용자 선택" }).waitFor();
  verify(true, "남긴 뒤 로그아웃");

  // 다른 태블릿: 새 context (localStorage · 로그인 정보 없음), 연습 서버 스냅숏만 넘김
  const other = await page.context().browser().newContext({ viewport: { width: 1024, height: 768 } });
  if (server) await other.addInitScript(state => { if (!sessionStorage.getItem("team3-mock")) sessionStorage.setItem("team3-mock", state); }, server);
  const tab = await other.newPage();
  tab.setDefaultTimeout(10000);
  await login(tab);
  await tab.locator(".handover-note").first().waitFor();
  const text = await tab.locator(".handover-note").first().innerText();
  verify(text.includes(note) && text.includes("이서준") && await tab.evaluate(() => localStorage.length === 0), "다른 태블릿에서 다시 들어와도 오늘 알림에 인계 표시");
  await tab.getByRole("button", { name: "확인했어요" }).first().click();
  await tab.waitForTimeout(400);
  verify(await tab.locator(".handover-note").count() === 0, "확인했어요 → 사라짐");
  await tab.reload();
  await tab.getByRole("button", { name: "접수 목록 보기" }).waitFor();
  await tab.waitForTimeout(400);
  verify(await tab.locator(".handover-note").count() === 0, "다시 들어와도 확인한 인계는 안 보임");
  const scroll = await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  verify(scroll, "가로 스크롤 없음");
  await other.close();
  return checks;
}
