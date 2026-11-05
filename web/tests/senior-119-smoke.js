// 어르신 화면 긴급 119: 위험 신호로 판정된 답에서만 119 버튼이 보이고, 약사에게 전화하는 버튼은 없음
// 누르면 확인창(긴급 접수 번호 안내) → 가상 119 통화창. 위험 신호가 아닌 답에는 119 버튼이 없음
async (page) => {
  page.setDefaultTimeout(10000);
  const origin = new URL(page.url()).origin;
  const checks = [];
  const verify = (ok, label) => { if (!ok) throw new Error("실패: " + label); checks.push(label); };
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(origin + "/");
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(origin + "/");
  await page.getByRole("heading", { name: "사용자 선택" }).waitFor();
  await page.getByRole("button", { name: /고객/ }).first().click();
  await page.locator(".person-card", { hasText: "최영순" }).click();
  await page.getByRole("textbox", { name: "입장 코드" }).fill("mock-119");
  await page.getByRole("button", { name: "최영순 님으로 로그인" }).click();
  await page.getByRole("heading", { name: "무엇을 도와드릴까요?" }).waitFor();
  const emergency = page.getByRole("button", { name: /긴급 상황이에요/ });
  verify(await page.getByRole("button", { name: /약사에게 전화/ }).count() === 0, "첫 화면에 '약사에게 전화' 버튼 없음");
  verify(await emergency.count() === 0, "첫 화면에 119 버튼 없음 (판정 전)");
  // 위험 신호가 아닌 질문 → 119 없음
  await page.locator("#senior-q").fill("콧물 감기약을 먹으면 왜 졸려요?");
  await page.getByRole("button", { name: "물어보기", exact: true }).click();
  await page.locator(".senior-card").waitFor();
  verify(await emergency.count() === 0, "보통 답에는 119 버튼 없음");
  await page.getByRole("button", { name: /다시 질문하기/ }).first().click();
  await page.getByRole("heading", { name: "무엇을 도와드릴까요?" }).waitFor();
  // 위험 신호 → 긴급 카드 + 119
  await page.locator("#senior-q").fill("약 먹고 지금 숨이 차고 가슴이 아파요");
  await page.getByRole("button", { name: "물어보기", exact: true }).click();
  await page.locator(".senior-danger").waitFor();
  verify(await emergency.count() === 1, "위험 신호 답에 119 버튼 하나");
  verify(await page.getByRole("button", { name: /약사에게 전화/ }).count() === 0, "긴급 카드에도 '약사에게 전화' 없음");
  const ticket = (await page.locator(".senior-ticket strong").innerText()).trim();
  await emergency.click();
  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor();
  const text = await dialog.innerText();
  verify(text.includes(`긴급 접수 ${ticket}`), `확인창에 긴급 접수 번호 (${ticket})`);
  verify(!text.includes("약사님께 질문하기"), "화면에 없는 버튼 안내 문구 없음");
  await dialog.getByRole("button", { name: "네, 119에 연결할게요" }).click();
  await page.getByRole("dialog", { name: /119 전화/ }).waitFor();
  verify(await page.getByText("119에 연결하고 있어요.").count() > 0, "가상 119 통화창");
  return checks;
}
