// 말로 묻기 (마이크) 시험: 가짜 음성 인식을 넣고 고객(최영순) 화면에서 누르기 → 듣기 → 문장 → 물어보기 → 보완 질문 → 말로 하기 → 이어서 답하기
async (page) => {
  page.setDefaultTimeout(10000);
  const origin = new URL(page.url()).origin;
  const checks = [];
  const verify = (ok, label) => { if (!ok) throw new Error("실패: " + label); checks.push(label); };
  await page.addInitScript(() => {
    const phrases = ["혈압약이랑 관절약 같이 먹어도 돼요?", "암로디핀이랑 이부프로펜이요"];
    window.__micStarts = 0;
    class FakeRecognition {
      start() {
        window.__micStarts += 1;
        const phrase = phrases.shift() || "";
        this.timers = [
          setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: phrase.split(" ").slice(0, 1).join(" ") } }] }), 400),
          setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: phrase } }] }), 1200),
          setTimeout(() => this.onend && this.onend(), 1400),
        ];
      }
      stop() {}
      abort() { (this.timers || []).forEach(clearTimeout); }
    }
    window.webkitSpeechRecognition = FakeRecognition;
    window.SpeechRecognition = FakeRecognition;
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(origin + "/");
  const out = page.getByRole("button", { name: /로그아웃|나가기/ });
  await page.getByRole("heading", { name: /사용자 선택|질문하기|무엇을 도와드릴까요/ }).first().waitFor({ state: "visible" });
  if (await out.count()) await out.click();
  await page.getByRole("button", { name: /고객/ }).first().click();
  await page.locator(".person-card", { hasText: "최영순" }).click();
  await page.getByRole("textbox", { name: "입장 코드" }).fill("mock-voice");
  await page.getByRole("button", { name: "최영순 님으로 로그인" }).click();
  await page.getByRole("heading", { name: "무엇을 도와드릴까요?" }).waitFor();
  const mic = page.getByRole("button", { name: /말로 물어보기/ });
  verify(await mic.isVisible(), "마이크 버튼 보임");
  const box = await mic.boundingBox();
  verify(box.height >= 80, `마이크 버튼 높이 ${Math.round(box.height)}px ≥ 80`);
  await mic.click();
  await page.getByRole("button", { name: /듣고 있어요/ }).waitFor();
  verify(true, "누르면 '듣고 있어요'");
  await page.waitForTimeout(600);
  const send = page.getByRole("button", { name: /이대로 물어보기/ });
  await send.waitFor();
  const heard = await page.locator(".senior-heard").innerText();
  verify(heard.includes("혈압약이랑 관절약 같이 먹어도 돼요?"), `알아들은 문장 표시: ${heard}`);
  verify((await page.locator("#senior-q").inputValue()) === "혈압약이랑 관절약 같이 먹어도 돼요?", "입력칸에도 채워짐");
  await send.click();
  await page.locator(".senior-card").waitFor();
  const route = await page.locator(".senior-band").innerText();
  verify(await page.locator(".senior-question").innerText().then(t => t.includes("혈압약이랑")), "답 화면에 질문 표시");
  verify(/보완|조금 더/.test(route) || await page.locator("#context").count() > 0, `보완 질문 화면: ${route.replace(/\n/g, " ")}`);
  const followMic = page.getByRole("button", { name: /말로 하기/ });
  verify(await followMic.isVisible(), "보완 질문 칸에 마이크 버튼");
  await followMic.click();
  await page.waitForFunction(() => document.querySelector("#context")?.value === "암로디핀이랑 이부프로펜이요");
  verify(true, "보완 칸에 말한 약 이름 채워짐");
  await page.getByRole("button", { name: /이어서 답하기/ }).click();
  await page.waitForTimeout(1500);
  const after = await page.locator(".senior-body").innerText();
  verify(/접수 번호|약사/.test(after), "이어서 답하기 → 약사 접수");
  const sizes = await page.evaluate(() => ({
    tiny: [...document.querySelectorAll(".senior *")].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 18).map(e => e.textContent.slice(0, 20)),
    scroll: document.documentElement.scrollWidth,
  }));
  verify(sizes.tiny.length === 0, "어르신 글씨 18px 이상 " + sizes.tiny);
  verify(sizes.scroll <= 375, "375px 가로 스크롤 없음");
  await page.getByRole("button", { name: /다시 질문하기/ }).first().click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole("button", { name: /말로 물어보기/ }).waitFor();
  verify(await page.evaluate(() => window.__micStarts) === 2, "음성 인식 2번 시작");
  return checks;
}
