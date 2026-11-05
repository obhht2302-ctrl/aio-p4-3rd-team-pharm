// 해든: 계약 예시를 초기값으로 사용하고, 질문 → 보완 → 접수 → 약사 처리 흐름을 연습할 목데이터를 관리합니다.
import ex from "./contract-examples.json";
import type { Who } from "./session";

type RequestItem = { request_id: string; question: string; route: string; created_at: string; ticket: { ticket_id: string; status?: string } | null };
type Ticket = { ticket_id: string; status: string; [key: string]: unknown };
type AskInput = { user: string; question: string; context?: string; attempt?: number };
const examples = ex as unknown as Record<string, { response: unknown }>;
const copy = <T>(key: string): T => structuredClone(examples[key].response) as T;
const initialRequests = copy<{ items: RequestItem[] }>("GET /api/my-requests?user=김하늘").items;
const requests = new Map<string, RequestItem[]>([["김하늘", initialRequests]]);
const tickets = copy<{ items: Ticket[] }>("GET /api/admin/tickets").items;
const alerts = copy<{ items: unknown[] }>("GET /api/admin/alerts").items;
let hydrated = false;
let serial = 0;
const seniorFollowupQuestion = "혈압약이랑 관절약 같이 먹어도 돼요?";
const seniorDisclosure = "AI가 공공 의약품 정보를 정리한 안내예요. 복용 전 약사와 확인해 주세요.";

// 바쁜 날 연습 데이터: sessionStorage team3-mock-busy=1이면 실제 VM처럼 열린 접수 · 알림을 10건 남짓으로 늘립니다 (화면 시험용).
// 실제 알림에는 티켓 없는 n8n 날 문구('[other] owner에게 이관 ·')도 섞여 옵니다.
function seedBusy() {
  const at = (minute: number) => `2026-11-05T${String(9 + Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00+09:00`;
  const rows: [string, string, string, string, string][] = [
    ["T-2005", "마감 때 계산대 현금은 어떤 순서로 맞춰요?", "closing", "normal", "접수됨"],
    ["T-2006", "뉴스에 나온 OTC-03 시럽 회수요, 아직 진열돼 있어요. 제 마감 차액 건(R-1001)도 어떻게 됐나요?", "recall", "high", "처리 중"],
    ["T-2007", "뉴스에 나온 OTC-03 시럽 회수요, 아직 진열돼 있어요.", "recall", "high", "접수됨"],
    ["T-2008", "마감 차액은 얼마까지 승인 없이 처리해요?", "closing", "normal", "처리 완료"],
    ["T-2009", "약품 냉장고 온도가 9도로 올라가 있어요", "other", "high", "접수됨"],
    ["T-2010", "지금 숨이 차고 가슴이 아파요. 119 버튼을 눌렀어요.", "senior", "high", "접수됨"],
    ["T-2011", "뉴스에 나온 OTC-03 시럽이 아직 진열돼 있어요. 어떻게 해야 하나요?", "recall", "high", "접수됨"],
    ["T-2012", "혈압약과 골다공증약을 같이 먹어도 되나?", "senior", "normal", "접수됨"],
    ["T-2013", "포스 단말기 카드 결제가 자꾸 끊겨요", "other", "normal", "처리 완료"],
    ["T-2014", "마감이 안 돼요", "closing", "normal", "접수됨"],
  ];
  rows.forEach(([ticket_id, title, category, priority, status], index) => tickets.unshift({ ticket_id, key: `busy-${index}`, title, requester: "김하늘", category, priority, status, product: category === "recall" ? "OTC-03" : "", created_at: at(index * 7) }));
  const raw = (minute: number) => ({ workflow: "team3-handoff", severity: "high", reason: "handoff", message: "[other] owner에게 이관 ·", at: at(minute) });
  alerts.unshift(
    ...rows.filter(row => row[3] === "high").map(([ticket_id, title], index) => ({ workflow: "team3-handoff", severity: "high", reason: "urgent", message: `[긴급] ${title}`, ticket_id, at: at(60 - index) })),
    raw(30), raw(20),
    { workflow: "team3-errors", severity: "warning", reason: "llm_retry", message: "[warning] 답변 작성 다시 시도", at: at(10) },
    { workflow: "team3-handoff", severity: "high", reason: "urgent", message: "[긴급] 마감 차액은 얼마까지 승인 없이 처리해요?", ticket_id: "T-2008", at: at(5) },
  );
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const stored = sessionStorage.getItem("team3-mock");
    if (!stored && sessionStorage.getItem("team3-mock-busy") === "1") { seedBusy(); persist(); }
    if (!stored) return;
    const state = JSON.parse(stored) as { requests: Record<string, RequestItem[]>; tickets: Ticket[]; alerts?: unknown[] };
    requests.clear();
    for (const [name, items] of Object.entries(state.requests)) requests.set(name, items);
    tickets.splice(0, tickets.length, ...state.tickets);
    if (state.alerts) alerts.splice(0, alerts.length, ...state.alerts);
  } catch { /* 저장소를 사용할 수 없으면 메모리로 진행 */ }
}

function persist() {
  try { sessionStorage.setItem("team3-mock", JSON.stringify({ requests: Object.fromEntries(requests), tickets, alerts })); }
  catch { /* 사생활 모드에서는 메모리로만 진행 */ }
}

export function mock(method: string, path: string, body?: unknown, who?: Who | null): unknown {
  hydrate();
  const cleanPath = path.split("?")[0];
  if (method === "GET" && cleanPath === "/api/users") return copy("GET /api/users");
  if (method === "GET" && cleanPath === "/api/types") {
    const types = copy<{ items: { type: string; examples: string[] }[] }>("GET /api/types");
    // 해든: 화면 명세의 어르신 예시 버튼 3개를 확인할 수 있도록 QA 질문을 연습 데이터에 더합니다.
    const senior = types.items.find(item => item.type === "senior");
    if (senior && senior.examples.length < 3) senior.examples.push(seniorFollowupQuestion);
    return types;
  }
  if (method === "POST" && cleanPath === "/api/ask") {
    const input = body as AskInput;
    const exampleQuestion = ex["POST /api/ask"].request.question;
    const requestId = `mock-${Date.now()}-${++serial}`;
    const isFollowup = input.question === seniorFollowupQuestion;
    const needsMore = isFollowup && !input.context?.trim();
    const shouldHandoff = input.question !== exampleQuestion && !needsMore;
    let response: { route: string; answer: string; sources: unknown[]; ticket: RequestItem["ticket"]; agents: string[] };
    if (input.question === exampleQuestion) {
      response = copy<typeof response>("POST /api/ask");
    } else if (needsMore) {
      response = { route: "보완 질문", answer: "약 이름과 지금 드시는 약을 알려 주세요. 함께 복용해도 되는지는 확인이 필요해요.", sources: [], ticket: null, agents: [] };
    } else {
      response = {
        route: "담당자 이관",
        answer: isFollowup
          ? "알려 주신 내용을 약사가 확인할 수 있도록 접수했어요. 임의로 함께 복용하지 마세요."
          : "연습 모드에는 이 질문의 답변 자료가 없어요. 담당자 확인 건으로 접수했어요.",
        sources: [], ticket: null, agents: [],
      };
    }
    if (shouldHandoff) {
      const ticketId = `T-MOCK-${Date.now()}-${serial}`;
      const ticket: Ticket = {
        ticket_id: ticketId, key: requestId, title: input.question, requester: input.user,
        category: isFollowup ? "senior" : "other", priority: "normal", status: "접수됨",
        created_at: new Date().toISOString(),
      };
      tickets.unshift(ticket);
      response.ticket = { ticket_id: ticketId, status: "접수됨" };
    }
    if (who?.role === "patient") response.answer += `\n\n${seniorDisclosure}`;
    const item: RequestItem = { request_id: requestId, question: input.question, route: response.route, ticket: response.ticket, created_at: new Date().toISOString() };
    requests.set(input.user, [item, ...(requests.get(input.user) ?? [])]);
    persist();
    return { ...response, request_id: requestId };
  }
  if (method === "GET" && cleanPath === "/api/my-requests") {
    const user = new URLSearchParams(path.split("?")[1] ?? "").get("user") ?? "";
    if (who?.name !== user) throw new Error("내 문의만 확인할 수 있어요.");
    return { items: requests.get(user) ?? [] };
  }
  if (cleanPath.startsWith("/api/admin/")) {
    if (!who || !["pharmacist", "owner"].includes(who.role)) throw new Error("이 화면은 약사 · 약국장만 볼 수 있어요");
    if (cleanPath.endsWith("/recall-notice") && who.role !== "pharmacist") throw new Error("손님 안내는 약사만 기록할 수 있어요");
  }
  if (method === "GET" && cleanPath === "/api/admin/tickets") return { items: structuredClone(tickets) };
  if (method === "GET" && cleanPath === "/api/admin/alerts") return { items: structuredClone(alerts) };
  if (method === "PATCH" && cleanPath.startsWith("/api/admin/tickets/")) {
    const id = cleanPath.split("/").at(-1);
    const ticket = tickets.find(t => t.ticket_id === id);
    if (!ticket) throw new Error("없는 티켓이에요");
    Object.assign(ticket, body);
    for (const items of requests.values()) for (const item of items) if (item.ticket && item.ticket.ticket_id === id) item.ticket.status = ticket.status;
    persist();
    return structuredClone(ticket);
  }
  if (method === "POST" && cleanPath.endsWith("/recall-notice")) return copy("POST /api/admin/tickets/{id}/recall-notice");
  throw new Error("요청을 처리할 수 없어요.");
}
