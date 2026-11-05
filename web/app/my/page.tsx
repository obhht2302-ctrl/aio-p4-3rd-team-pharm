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
  { key: "handoff", label: "담당자 전달", test: (item: RequestItem) => !!item.ticket },
  { key: "doing", label: "처리 중", test: (item: RequestItem) => !!item.ticket && item.ticket.status !== "처리 완료" },
];

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

  const kpis = [
    { label: "전체", n: items.length, tone: "" },
    { label: "자동 답변", n: items.filter(item => item.route === "자동 답변").length, tone: "kpi-auto" },
    { label: "담당자 전달", n: items.filter(item => item.route === "담당자 이관").length, tone: "kpi-handoff" },
    { label: "아직 처리 중", n: items.filter(item => item.ticket && item.ticket.status !== "처리 완료").length, tone: "kpi-primary" },
  ];

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
        <div className="kpi-grid">{kpis.map(kpi => <div key={kpi.label} className="kpi-card"><small>{kpi.label}</small><b className={kpi.tone}>{kpi.n}</b></div>)}</div>
        <div className="soft-note"><b>문의 기록</b> 담당자 전달 건은 처리 완료까지 이 목록에서 확인할 수 있습니다.</div>
      </div>
    </Pager>
  </div>;
}
