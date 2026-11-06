// 어제(11/5 17:19) 확인 안 한 인계 #7만 약사 화면에서 '확인했어요' (형 14:11 OK)
const { chromium } = require("/root/tmp/p4_day80/.npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core");
const BASE = process.env.BASE, CODE = process.env.CODE, OUT = process.argv[2];
(async () => {
  const b = await chromium.launch({ channel: "chrome", args: ["--no-sandbox"] });
  const c = await b.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  const p = await c.newPage(); p.setDefaultTimeout(30000);
  const seen = [];
  p.on("response", async r => { if (r.url().includes("/api/admin/handover")) { let j = null; try { j = await r.json(); } catch {} seen.push({ m: r.request().method(), path: new URL(r.url()).pathname, s: r.status(), id: j?.item?.id ?? null, at: j?.item?.at ?? null, by: j?.item?.by ?? null }); } });
  await p.goto(BASE + "/admin/"); await p.waitForTimeout(800);
  await p.getByRole("heading", { name: "사용자 선택" }).waitFor();
  await p.getByRole("button", { name: /책임 약사/ }).first().click();
  await p.locator(".person-card", { hasText: "이서준" }).click();
  await p.getByRole("textbox", { name: "입장 코드" }).fill(CODE);
  await p.getByRole("button", { name: "이서준 님으로 로그인" }).click();
  await p.getByRole("button", { name: /로그아웃|나가기/ }).first().waitFor();
  await p.goto(BASE + "/admin/");
  await p.getByRole("button", { name: "접수 목록 보기" }).waitFor(); await p.waitForTimeout(1200);
  const last = seen.filter(x => x.m === "GET").pop();
  console.log("지금 뜨는 인계:", JSON.stringify(last));
  const TARGET = Number(process.env.TARGET || 7);
  if (!last || last.id !== TARGET) { console.log("대상 인계가 아님 → 손대지 않고 멈춤"); await b.close(); return; }
  await p.screenshot({ path: `${OUT}/0-before-confirm${TARGET}.png` });
  await p.getByRole("button", { name: "확인했어요" }).first().click(); await p.waitForTimeout(800);
  await p.reload(); await p.getByRole("button", { name: "접수 목록 보기" }).waitFor(); await p.waitForTimeout(1200);
  console.log("확인 뒤:", JSON.stringify(seen.slice(-3)), "카드 수:", await p.locator(".handover-note").count());
  await b.close();
})();
