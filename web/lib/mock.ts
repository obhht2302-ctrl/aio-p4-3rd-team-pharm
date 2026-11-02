// 가짜 응답 = contracts/examples/api.json 그대로 (packs.py build 가 lib/contract-examples.json 으로 복사)
import ex from "./contract-examples.json";
const E = ex as Record<string, any>;
export function mock(method: string, path: string, body?: any): any {
  const p = path.split("?")[0];
  if (method === "GET" && p === "/api/users") return E["GET /api/users"].response;
  if (method === "GET" && p === "/api/types") return E["GET /api/types"].response;
  if (method === "POST" && p === "/api/ask") return { ...E["POST /api/ask"].response, request_id: `mock-${Date.now()}` };
  if (method === "GET" && p === "/api/my-requests") return E["GET /api/my-requests?user=김하늘"].response;
  if (method === "GET" && p === "/api/admin/tickets") return E["GET /api/admin/tickets"].response;
  if (method === "GET" && p === "/api/admin/alerts") return E["GET /api/admin/alerts"].response;
  if (method === "PATCH" && p.startsWith("/api/admin/tickets/")) return { ...E["PATCH /api/admin/tickets/{id}"].response, ...body };
  if (method === "POST" && p.endsWith("/recall-notice")) return E["POST /api/admin/tickets/{id}/recall-notice"].response;
  throw new Error("가짜 응답이 없는 경로예요: " + method + " " + p);
}
