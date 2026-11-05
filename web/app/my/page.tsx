"use client";

// 해든: 3004의 내 문의(문의 목록 → 한눈에 보기)를 /api/my-requests로 연결했습니다.
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Clock3 } from "lucide-react";
import { api } from "@/lib/api";
import { useWho } from "@/lib/session";
import type { RequestItem } from "@/lib/use-ask";
import { LoginPanel } from "@/components/login";
import { Pager, ScrollBox } from "@/components/pager";
import { RouteBadge } from "@/components/route-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
};
const statusTone = (status?: string) => status === "처리 완료" ? "done" : status === "처리 중" ? "doing" : "new";
const FILTERS = [
  { key: "all", label: "전체", test: () => true },
  { key: "handoff", label: "담당자 전달", test: (item: RequestItem) => item.route === "담당자 이관" },
  { key: "doing", label: "처리 중", test: (item: RequestItem) => !!item.ticket && item.ticket.status !== "처리 완료" },
];

// 한눈에 보기 칸은 응답 경로(route) 기준: 칸 합 = 전체. 보완 질문 · 권한 없음 · 차단도 문의 기록에 남으므로
// 자동 · 전달 두 칸만 세면 합이 안 맞았음 (VM 한기철 7건 = 전달 6 + 보완 질문 1). 경로가 없거나 낯선 값은 '기타'로.
const ROUTE_KPIS = [
  { label: "자동 답변", route: "자동 답변", tone: "kpi-auto" },
  { label: "담당자 전달", route: "담당자 이관", tone: "kpi-handoff" },
  { label: "보완 질문", route: "보완 질문", tone: "kpi-ask" },
];
const isPending = (item: RequestItem) => !!item.ticket && item.ticket.status !== "처리 완료";

// 상태 옆에 누가 무엇을 하고 있는지 한 줄 (화면이 모르는 것은 말하지 않음: "오고 있어요" 같은 말 금지)
const statusLine: Record<string, string> = { "접수됨": "담당자가 곧 확인해요", "처리 중": "담당자가 보고 있어요", "처리 완료": "처리가 끝났어요" };
function Status({ status }: { status?: string }) {
  const label = status ?? "접수됨";
  return <span className="status-wrap"><span className={`status-pill tone-${statusTone(status)}`}>{label}</span>{statusLine[label] && <span className="status-line">{statusLine[label]}</span>}</span>;
}

export default function MyPage() {
  const who = useWho();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!who) return;
    api<{ items: RequestItem[] }>("GET", `/api/my-requests?user=${encodeURIComponent(who.name)}`, who)
      .then(result => setItems(result.items)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [who]);

  const rows = useMemo(() => items.filter(FILTERS.find(item => item.key === filter)!.test).filter(item => item.question.includes(search.trim())), [items, filter, search]);

  if (who === undefined) return <Skeleton className="h-72 w-full" />;
  if (!who) return <LoginPanel />;

  const parts = ROUTE_KPIS.map(kpi => ({ ...kpi, n: items.filter(item => item.route === kpi.route).length }));
  const other = items.length - parts.reduce((sum, kpi) => sum + kpi.n, 0);
  const kpis: { label: string; tone: string; n: number; sub?: string }[] = [...parts, { label: "기타", tone: "kpi-other", n: other, sub: "권한 없음 · 차단" }];
  const pending = items.filter(isPending);

  return <div className="app-fill">
    <h1 className="sr-only">내 문의</h1>
    <Pager steps={["문의 목록", "한눈에 보기"]} index={page} onIndex={setPage}>
      <div className="list-step fit">
        <div className="list-tools">
          <Tabs value={filter} onValueChange={value => setFilter(String(value))}><TabsList className="ticket-tab-list">{FILTERS.map(item => <TabsTrigger key={item.key} value={item.key} className="ticket-tab">{item.label}{filter === item.key && <motion.span layoutId="my-tab-underline" className="ticket-tab-underline" />}</TabsTrigger>)}</TabsList></Tabs>
          <input type="search" className="search-box" value={search} onChange={e => setSearch(e.target.value)} placeholder="질문 검색" aria-label="질문 검색" />
        </div>
        <div className="table-card"><ScrollBox className="table-scroll">
          {loading ? <div className="space-y-4 p-6"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> :
            error ? <div className="p-6"><p className="error-box" role="alert">{error}</p></div> :
            rows.length === 0 ? <div className="empty-state">{items.length ? <strong>검색 결과가 없어요.</strong> : <><strong>아직 물어본 게 없어요</strong><p>궁금한 건 언제든 편하게 물어보세요.</p></>}</div> : <>
              <div className="desktop-table"><Table><TableHeader><TableRow><TableHead className="pl-5">시각</TableHead><TableHead>질문</TableHead><TableHead>결과</TableHead><TableHead>접수 번호</TableHead><TableHead className="pr-5">진행 상태</TableHead></TableRow></TableHeader>
                <TableBody>{rows.map(item => <TableRow key={item.request_id}><TableCell className="pl-5 text-muted-foreground">{dateLabel(item.created_at)}</TableCell><TableCell className="max-w-96 whitespace-normal"><span className="font-medium">{item.question}</span><div className="request-id">요청 번호 {item.request_id}</div></TableCell><TableCell><RouteBadge route={item.route} /></TableCell><TableCell className="font-bold">{item.ticket ? item.ticket.ticket_id : <span className="font-normal text-muted-foreground">없음</span>}</TableCell><TableCell className="pr-5">{item.ticket ? <Status status={item.ticket.status} /> : <span className="text-muted-foreground">없음</span>}</TableCell></TableRow>)}</TableBody></Table></div>
              <div className="mobile-cards p-3">{rows.map(item => <div className="list-card" key={item.request_id}><div className="meta-line"><RouteBadge route={item.route} /><span className="request-id">{item.request_id}</span></div><p className="font-medium">{item.question}</p><div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Clock3 size={14} />{dateLabel(item.created_at)}{item.ticket && <span className="ticket-tag">{item.ticket.ticket_id}</span>}{item.ticket && <Status status={item.ticket.status} />}</div></div>)}</div>
            </>}
        </ScrollBox>
        {!loading && !error && items.length > 0 && <p className="list-foot">{rows.length}건 · 담당자 전달 건은 처리 완료까지 여기서 확인할 수 있어요</p>}</div>
      </div>
      <div className="kpi-step fit">
        <div className="kpi-grid kpi-five">
          <div className="kpi-card kpi-total" data-kpi="total"><small>전체</small><b>{items.length}</b></div>
          {kpis.map(kpi => <div key={kpi.label} className="kpi-card" data-kpi="part"><small>{kpi.label}</small><b className={kpi.tone}>{kpi.n}</b>{kpi.sub && <em className="kpi-sub">{kpi.sub}</em>}</div>)}
        </div>
        <section className="soft-card pending-card" aria-label="아직 처리 중인 문의">
          <h2>아직 처리 중인 문의 <small>{pending.length}건</small></h2>
          {loading ? <Skeleton className="h-12 w-full" /> : pending.length ? <ScrollBox className="pending-scroll">{pending.map(item => <div key={item.request_id} className="open-row">
            <span className="open-title">{item.question}</span><span className="open-id">{item.ticket!.ticket_id}</span><Status status={item.ticket!.status} />
          </div>)}</ScrollBox> : <div className="empty-state"><strong>처리 중인 문의가 없어요</strong><p>담당자에게 전달된 문의가 생기면 여기서 진행 상태를 볼 수 있어요.</p></div>}
          <p className="pending-foot">처리가 끝나면 여기서 빠져요 · 지난 문의는 &lsquo;문의 목록&rsquo;에서 볼 수 있어요</p>
        </section>
      </div>
    </Pager>
  </div>;
}
