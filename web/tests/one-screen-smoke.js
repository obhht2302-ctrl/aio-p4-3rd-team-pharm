// 한 화면 시험 (태블릿 앱): 창 7개 × 모든 화면 · 단계에서 바깥 세로 스크롤 · 가로 넘침 · 겹침 · 잘림 · 어색한 줄바꿈 · 아래 빈 공간을 숫자로 잽니다.
// 태블릿 · 폰은 hasTouch(태블릿 틀 꺼짐), PC는 마우스(틀 켜짐). 목록 · 긴 답은 그 상자 안 스크롤만 허용. 어르신은 글씨 18 · 20 · 22px.
// 캡처: SHOTS 폴더(기본 /root/tmp/p4_screen_app/shots). 실패가 하나라도 있으면 목록과 함께 멈춥니다.
async (page) => {
  const origin = new URL(page.url()).origin;
  const browser = page.context().browser();
  const SHOTS = "/root/tmp/p4_screen_app/shots";
  const VIEWPORTS = [
    { name: "tab-1024x768", width: 1024, height: 768, touch: true },
    { name: "tab-1180x820", width: 1180, height: 820, touch: true },
    { name: "tab-768x1024", width: 768, height: 1024, touch: true },
    { name: "tab-834x1194", width: 834, height: 1194, touch: true },
    { name: "pc-1440x900", width: 1440, height: 900, touch: false },
    { name: "pc-1920x1080", width: 1920, height: 1080, touch: false },
    { name: "phone-390x844", width: 390, height: 844, touch: true, phone: true },
  ];
  const fails = [];
  const rows = [];

  // 화면 안에서 재는 함수 (문자열로 넘겨 브라우저에서 실행)
  const MEASURE = () => {
    const frame = document.querySelector(".tablet-screen");
    const framed = !!frame && getComputedStyle(frame).display !== "contents";
    const outer = framed ? frame : document.scrollingElement;
    const main = document.querySelector(".page-container");
    const pager = document.querySelector(".pager");
    let active = null;
    if (pager) {
      const left = pager.getBoundingClientRect().left;
      active = [...pager.children].find(child => Math.abs(child.getBoundingClientRect().left - left) < 4) || null;
    }
    const region = active || main;
    const overY = el => el ? Math.max(0, el.scrollHeight - el.clientHeight - 1) : 0;
    const overX = el => el ? Math.max(0, el.scrollWidth - el.clientWidth - 1) : 0;
    const scrolls = v => v === "auto" || v === "scroll";
    const visibleBox = el => {
      const r = el.getBoundingClientRect();
      const box = { l: r.left, t: r.top, r: r.right, b: r.bottom, cutBy: "" };
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.display === "contents") continue;
        const q = p.getBoundingClientRect();
        if (cs.overflowX !== "visible") {
          if (!scrolls(cs.overflowX) && (box.l < q.left - 1 || box.r > q.right + 1)) box.cutBy ||= p.className || p.tagName;
          box.l = Math.max(box.l, q.left); box.r = Math.min(box.r, q.right);
        }
        if (cs.overflowY !== "visible") {
          if (!scrolls(cs.overflowY) && (box.t < q.top - 1 || box.b > q.bottom + 1)) box.cutBy ||= p.className || p.tagName;
          box.t = Math.max(box.t, q.top); box.b = Math.min(box.b, q.bottom);
        }
      }
      return box;
    };
    const roots = [document.querySelector(".site-header"), region, document.querySelector(".site-footer")].filter(Boolean);
    const leaves = [];
    for (const root of roots) for (const el of root.querySelectorAll("*")) {
      if (el.closest("[data-sonner-toaster]") || (el.closest("svg") && el.tagName.toLowerCase() !== "svg")) continue;
      const leaf = el.matches("input, textarea, select, img, svg") || [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!leaf) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
      const box = visibleBox(el);
      if (box.r - box.l < 2 || box.b - box.t < 2) continue;
      leaves.push({ el, box, inRegion: region.contains(el) });
    }
    const label = el => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}「${(el.innerText || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 14)}」`;
    const overlaps = [];
    for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i], b = leaves[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.box.r, b.box.r) - Math.max(a.box.l, b.box.l);
      const h = Math.min(a.box.b, b.box.b) - Math.max(a.box.t, b.box.t);
      if (w > 2 && h > 2) overlaps.push(`${label(a.el)} × ${label(b.el)}`);
    }
    const clipped = [];
    for (const { el, box } of leaves) {
      if (box.cutBy) { clipped.push(`${label(el)} ← ${String(box.cutBy).split(" ")[0]}`); continue; }
      const cs = getComputedStyle(el);
      if (cs.overflowX !== "visible" && !scrolls(cs.overflowX) && cs.textOverflow !== "ellipsis" && el.scrollWidth > el.clientWidth + 1 && !el.matches("input, textarea, svg")) clipped.push(label(el));
    }
    // 어색한 줄바꿈: 짧은 이름표(버튼 · 탭 · 단계 · 배지)가 꺾이면 실패. 띄어쓰기 없는 낱말은 1줄, 있으면 2줄까지
    const wraps = [];
    for (const el of document.querySelectorAll(".site-header a, .site-header button, button, [role=tab], .senior-steps li, .status-pill, .route-badge, .urgent-pill, th, .kpi-card small")) {
      if (!roots.some(root => root.contains(el))) continue;
      const text = (el.innerText || "").trim().replace(/\s+/g, " ");
      if (!text || text.length > 14) continue;
      const box = visibleBox(el);
      if (box.r - box.l < 2 || box.b - box.t < 2) continue;
      const tops = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) if (r.width > 0 && !tops.some(t => Math.abs(t - r.top) < 6)) tops.push(r.top);
      }
      if (tops.length > (text.includes(" ") ? 2 : 1)) wraps.push(`${label(el)} ${tops.length}줄`);
    }
    const r = region.getBoundingClientRect();
    const bottoms = leaves.filter(x => x.inRegion).map(x => x.box.b);
    const contentBottom = bottoms.length ? Math.max(...bottoms) : r.top;
    const gap = overY(region) > 0 ? 0 : Math.max(0, r.bottom - contentBottom) / r.height;
    // 가운데 빈 띠: 글자 · 버튼이 하나도 없는 가로 띠 중 가장 높은 것 (참고값, 40% 넘으면 경고)
    const spans = leaves.filter(x => x.inRegion).map(x => [x.box.t, x.box.b]).sort((a, b) => a[0] - b[0]);
    let band = 0, reach = r.top;
    for (const [t, b] of spans) { band = Math.max(band, t - reach); reach = Math.max(reach, b); }
    return {
      framed,
      outerY: overY(outer), mainY: overY(main), regionY: active ? overY(active) : overY(main),
      overX: Math.max(document.documentElement.scrollWidth - innerWidth, overX(main), overX(active), framed ? overX(frame) : 0),
      gap: Math.round(gap * 100) / 100, band: Math.round(Math.max(0, band) / r.height * 100) / 100, overlaps: overlaps.slice(0, 6), clipped: clipped.slice(0, 6), wraps: wraps.slice(0, 6),
    };
  };

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: !!vp.phone });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const pageErrors = [];
    p.on("pageerror", e => pageErrors.push(String(e)));
    // strict: 바깥 · 본문 · 단계 칸 세로 스크롤 없음까지 봄 (폰 · 어르신 답 화면은 넘김 허용)
    const check = async (screen, { strict = !vp.phone } = {}) => {
      await p.waitForTimeout(650);
      const m = await p.evaluate(MEASURE);
      await p.screenshot({ path: `${SHOTS}/${vp.name}-${screen}.png` });
      const bad = [];
      if (strict && (m.outerY || m.mainY || m.regionY)) bad.push(`세로 스크롤 바깥 ${m.outerY} · 본문 ${m.mainY} · 단계 ${m.regionY}px`);
      if (!strict && m.outerY) bad.push(`바깥 세로 스크롤 ${m.outerY}px`);
      if (m.overX) bad.push(`가로 넘침 ${m.overX}px`);
      if (m.overlaps.length) bad.push(`겹침 ${m.overlaps.join(" / ")}`);
      if (m.clipped.length) bad.push(`잘림 ${m.clipped.join(" / ")}`);
      if (m.wraps.length) bad.push(`줄바꿈 ${m.wraps.join(" / ")}`);
      if (!vp.phone && m.gap > 0.4) bad.push(`아래 빈 공간 ${Math.round(m.gap * 100)}%`);
      rows.push(`${vp.name} ${screen}: 단계Y ${m.regionY} 본문Y ${m.mainY} 바깥Y ${m.outerY} 가로 ${m.overX} 아래빈곳 ${Math.round(m.gap * 100)}% 가운데띠 ${Math.round(m.band * 100)}%${m.band > 0.4 ? "(경고)" : ""}${m.framed ? " (틀)" : ""}${bad.length ? " ✗" : " ✓"}`);
      for (const b of bad) fails.push(`${vp.name} ${screen}: ${b}`);
    };
    const step = async (index) => { await p.locator(".pager-wrap ol button").nth(index).click(); await p.waitForTimeout(400); };
    const login = async (role, name, screens = false) => {
      await p.goto(origin + "/");
      await p.evaluate(() => sessionStorage.clear());
      await p.goto(origin + "/");
      await p.getByRole("heading", { name: "사용자 선택" }).waitFor();
      if (screens) await check("login-role");
      await p.getByRole("button", { name: new RegExp(role) }).first().click();
      await p.locator(".person-card", { hasText: name }).click();
      await p.getByRole("textbox", { name: "입장 코드" }).fill("mock-one-screen");
      if (screens) await check("login-code");
      await p.getByRole("button", { name: `${name} 님으로 로그인` }).click();
      await p.getByRole("button", { name: /로그아웃|나가기/ }).waitFor();
    };

    await login("직원", "김하늘", true);
    await p.getByRole("textbox", { name: "질문 내용" }).waitFor();
    await check("staff-write");
    await p.getByRole("textbox", { name: "질문 내용" }).fill("마감 때 계산대 현금은 어떤 순서로 맞춰요?");
    await p.getByRole("button", { name: "보내기", exact: true }).click();
    await p.getByText("자동 답변", { exact: true }).first().waitFor();
    await check("staff-answer");
    await p.goto(origin + "/my/");
    await p.waitForFunction(() => document.querySelector(".table-scroll")?.innerText.includes("마감 때 계산대 현금은"));
    await check("my-list");
    await step(1);
    await check("my-summary");

    await login("책임 약사", "이서준");
    await p.goto(origin + "/admin/");
    await p.getByRole("button", { name: "접수 목록 보기" }).waitFor();
    await check("admin-alerts");
    await step(1);
    await check("admin-list");
    await p.locator(".ticket-link", { hasText: "OTC-03 회수 제품 진열 중" }).click();
    await p.getByRole("button", { name: "상태 저장" }).waitFor();
    await p.waitForTimeout(400);
    await check("admin-detail");
    await step(3);
    await check("admin-handover");
    await p.locator("#handover-note").fill("회수 건 손님 연락이 한 분 남았어요. 오후 입고분 검수도 아직이에요.");
    await p.getByRole("button", { name: "인계 남기기" }).click();
    await p.locator(".handover-note").first().waitFor();
    await p.waitForTimeout(1500); // 알림 토스트가 걷힌 뒤
    await check("admin-handover-memo");
    await step(0);
    await check("admin-alerts-memo");

    await login("고객", "최영순");
    await p.getByRole("heading", { name: "무엇을 도와드릴까요?" }).waitFor();
    for (const [size, px] of [["더 크게", 20], ["크게", 18], ["아주 크게", 22]]) {
      await p.locator(".senior-sizes").getByRole("button", { name: size, exact: true }).click();
      // 어르신 첫 화면은 1024×768(20px)에서 한 화면이어야 함
      await check(`senior-ask-${px}`, { strict: vp.name === "tab-1024x768" && px === 20 });
    }
    await p.locator(".senior-sizes").getByRole("button", { name: "더 크게", exact: true }).click();
    await p.getByRole("button", { name: /혈압약이랑 관절약 같이 먹어도 돼요/ }).click();
    await p.getByText("보완 질문", { exact: true }).waitFor();
    for (const [size, px] of [["크게", 18], ["더 크게", 20], ["아주 크게", 22]]) {
      await p.locator(".senior-sizes").getByRole("button", { name: size, exact: true }).click();
      await check(`senior-followup-${px}`, { strict: false });
    }
    await p.getByRole("textbox", { name: "조금 더 알려 주세요" }).fill("암로디핀과 이부프로펜");
    await p.getByRole("button", { name: /이어서 답하기/ }).click();
    await p.getByText("담당자 이관", { exact: true }).waitFor();
    await check("senior-answer-22", { strict: false });
    await p.locator(".senior-sizes").getByRole("button", { name: "크게", exact: true }).click();
    await check("senior-answer-18", { strict: false });
    if (pageErrors.length) fails.push(`${vp.name}: 화면 오류 ${pageErrors.slice(0, 2).join(" / ")}`);
    await ctx.close();
  }
  if (fails.length) throw new Error(`한 화면 시험 실패 ${fails.length}건\n${fails.join("\n")}\n---\n${rows.join("\n")}`);
  return rows;
}
