// 5교시 피드백 4 — 최신 화면 → /api/ask → n8n → 티켓 → FastAPI PG → 약사 화면 → 인수인계 → 다음 접속 (VM 실제 모드, 헤드리스)
// BASE · CODE는 env로만 받음 (파일 · 출력에 안 씀)
const { chromium } = require("playwright-core");
const fs = require("fs");
const BASE = process.env.BASE, CODE = process.env.CODE, OUT = process.argv[2];
const Q = "마감 차액은 얼마까지 승인 없이 처리해요?";
const NOTE = `5교시 인수인계 시연 ${new Date().toISOString().slice(11, 16)}Z — 마감 차액 건 약국장 확인 부탁`;
const log = []; const api = [];
const step = async (p, name, shot) => { log.push({ at: new Date().toISOString(), step: name }); if (shot) await p.screenshot({ path: `${OUT}/${shot}.png` }); console.log("✔", name); };
const hook = p => p.on("response", async r => { const u = r.url(); if (!u.includes("/api/")) return; let body = null; try { body = await r.json(); } catch {} api.push({ at: new Date().toISOString(), method: r.request().method(), path: new URL(u).pathname, status: r.status(), body }); });
async function login(p, path, role, name) {
  await p.goto(BASE + path);
  await p.waitForTimeout(800);
  const out = p.getByRole("button", { name: /로그아웃|나가기/ });
  if (await out.count()) { await out.first().click(); await p.waitForTimeout(400); }
  await p.getByRole("heading", { name: "사용자 선택" }).waitFor();
  await p.getByRole("button", { name: new RegExp(role) }).first().click();
  await p.locator(".person-card", { hasText: name }).click();
  await p.getByRole("textbox", { name: "입장 코드" }).fill(CODE);
  await p.getByRole("button", { name: `${name} 님으로 로그인` }).click();
  await p.getByRole("button", { name: /로그아웃|나가기/ }).first().waitFor();
  if (path !== "/") await p.goto(BASE + path);
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", args: ["--no-sandbox"] });
  const result = { ok: false };
  try {
    // 1) 직원 김하늘 — 질문 화면
    const c1 = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
    const p1 = await c1.newPage(); p1.setDefaultTimeout(30000); hook(p1);
    await login(p1, "/", "직원", "김하늘");
    await p1.getByRole("textbox", { name: "질문 내용" }).fill(Q);
    await step(p1, "1 직원 김하늘 로그인 · 질문 입력", "1-staff-question");
    const askResp = p1.waitForResponse(r => r.url().includes("/api/ask") && r.request().method() === "POST", { timeout: 40000 });
    await p1.getByRole("button", { name: "보내기", exact: true }).click();
    const ask = await (await askResp).json();
    await p1.waitForTimeout(300);
    result.ask = { route: ask.route, reason: ask.reason, ticket: ask.ticket, request_id: ask.request_id, agents: ask.agents };
    await p1.locator(".ticket-number strong").first().waitFor();
    const shownTicket = (await p1.locator(".ticket-number strong").first().innerText()).trim();
    result.screen_ticket = shownTicket;
    await p1.waitForTimeout(1500); // 답 카드 나타나는 애니메이션 끝난 뒤 캡처
    await step(p1, `2 화면 답 = ${ask.route} · 접수 번호 ${shownTicket} (응답 ticket ${ask.ticket?.ticket_id} · 담당 ${ask.ticket?.assignee})`, "2-staff-answer");
    await c1.close();
    // 2) 책임 약사 이서준 — 접수 목록 · 인계 남기기
    const c2 = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
    const p2 = await c2.newPage(); p2.setDefaultTimeout(30000); hook(p2);
    await login(p2, "/admin/", "책임 약사", "이서준");
    await p2.getByRole("button", { name: "접수 목록 보기" }).waitFor();
    await p2.waitForTimeout(1200);
    const h0 = api.filter(a => a.path === "/api/admin/handover" && a.method === "GET").pop();
    result.handover_before = h0?.body?.item ? h0.body.item.id : null;
    await step(p2, `3 약사 이서준 로그인 (오늘 화면) — 시작 전 확인 안 한 인계 ${result.handover_before ?? "없음"}`, "3-pharm-home");
    await p2.getByRole("button", { name: "접수 목록 보기" }).click();
    await p2.waitForTimeout(1200);
    const tl = api.filter(a => a.path === "/api/admin/tickets").pop();
    const row = (tl?.body?.items || []).find(t => t.ticket_id === shownTicket);
    result.admin_ticket = row || null;
    const rowVisible = await p2.locator("tr", { hasText: Q.slice(0, 10) }).count();
    await step(p2, `4 약사 접수 목록에 ${shownTicket} — API 행 ${row ? "있음" : "없음"} (담당 ${row?.assignee}) · 화면 줄 ${rowVisible}`, "4-pharm-list");
    await p2.getByRole("button", { name: /인수인계/ }).first().click();
    await p2.getByRole("heading", { name: "퇴근 인수인계" }).waitFor();
    const openLine = await p2.locator(".handover-open").innerText();
    result.open_has_ticket = openLine.includes(shownTicket);
    await p2.locator("#handover-note").fill(NOTE);
    await step(p2, `5 인수인계 화면 — 열린 건 자동 첨부에 ${shownTicket} ${result.open_has_ticket ? "있음" : "없음"}`, "5-handover-write");
    const addResp = p2.waitForResponse(r => r.url().endsWith("/api/admin/handover") && r.request().method() === "POST");
    await p2.getByRole("button", { name: "인계 남기기" }).click();
    const add = await (await addResp).json();
    result.handover = { id: add.item?.id, by: add.item?.by, open_count: add.item?.open?.length, has_ticket: (add.item?.open || []).some(t => t.ticket_id === shownTicket) };
    await p2.locator(".handover-note").first().waitFor();
    await step(p2, `6 인계 남김 (id ${result.handover.id}, 열린 건 ${result.handover.open_count}개)`, "6-handover-saved");
    await p2.getByRole("button", { name: "로그아웃" }).click();
    await c2.close();
    // 3) 다른 태블릿 = 새 context (localStorage 빈 상태) · 약국장 정민재
    const c3 = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
    const p3 = await c3.newPage(); p3.setDefaultTimeout(30000); hook(p3);
    await login(p3, "/admin/", "약국장", "정민재");
    await p3.locator(".handover-note").first().waitFor();
    const noteText = await p3.locator(".handover-note").first().innerText();
    result.next_login = { sees_note: noteText.includes(NOTE.slice(0, 12)), by_seojun: noteText.includes("이서준"), local_empty: await p3.evaluate(() => localStorage.length === 0 || !Object.keys(localStorage).some(k => /handover/i.test(k))) };
    await step(p3, `7 다른 태블릿 · 약국장 정민재 로그인 → 지난 근무 인계 보임 (${result.next_login.sees_note})`, "7-next-login");
    const doneResp = p3.waitForResponse(r => /\/api\/admin\/handover\/\d+\/done/.test(r.url()));
    await p3.getByRole("button", { name: "확인했어요" }).first().click();
    result.done = (await (await doneResp).json()).item;
    await p3.waitForTimeout(600);
    const after = await p3.locator(".handover-note").count();
    await step(p3, `8 확인했어요 → 카드 ${after}개`, "8-done");
    await p3.reload(); await p3.getByRole("button", { name: "접수 목록 보기" }).waitFor(); await p3.waitForTimeout(800);
    result.after_reload = await p3.locator(".handover-note").count();
    await step(p3, `9 다시 접속 → 카드 ${result.after_reload}개`, "9-reload");
    await c3.close();
    result.ok = result.handover_before === null && ask.ticket?.ticket_id === shownTicket && !!row && result.handover.has_ticket && result.next_login.sees_note && after === 0 && result.after_reload === 0;
  } catch (e) { result.error = String(e.message || e).slice(0, 400); console.log("FAIL", result.error); }
  result.steps = log;
  fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(result, null, 1));
  fs.writeFileSync(`${OUT}/api.json`, JSON.stringify(api, null, 1));
  console.log(JSON.stringify({ ok: result.ok, ask: result.ask, screen_ticket: result.screen_ticket, admin_ticket: result.admin_ticket && { ticket_id: result.admin_ticket.ticket_id, assignee: result.admin_ticket.assignee, priority: result.admin_ticket.priority, status: result.admin_ticket.status }, handover: result.handover, next_login: result.next_login, after_reload: result.after_reload, error: result.error }, null, 1));
  await browser.close();
})();
