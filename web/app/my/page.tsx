"use client";

// 해든: 사용자별 문의 내역과 이관 티켓 상태를 데스크톱 표와 모바일 카드로 보여 줍니다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Clock3, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { loadWho } from "@/lib/session";
import { RouteBadge } from "@/components/route-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Item = { request_id: string; question: string; route: string; created_at: string; ticket: { ticket_id: string; status?: string } | null };
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
};
// API는 담당자 이름을 주지 않아서 상태만 사람 말로 바꿔 보여 줍니다.
const statusWords: Record<string, string> = { "접수됨": "담당자에게 전했어요", "처리 중": "담당자가 보고 있어요", "처리 완료": "처리를 마쳤어요" };
const statusLabel = (status?: string) => statusWords[status ?? "접수됨"] ?? status;

export default function MyPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [senior, setSenior] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const who = loadWho();
    if (!who) { setError("질문하기 화면에서 먼저 들어와 주세요."); setLoading(false); return; }
    setName(who.name);
    setSenior(who.role === "patient");
    api<{ items: Item[] }>("GET", `/api/my-requests?user=${encodeURIComponent(who.name)}`, who)
      .then(result => setItems(result.items)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return <div className={senior ? "senior" : ""}>
    <div className="page-intro"><p className="eyebrow">{BRAND.service}</p><h1 className="page-title">내 문의</h1><p className="page-description">{name ? `${name}님이 남긴 질문과 담당자 접수 상태를 확인하세요.` : "내가 남긴 질문과 접수 상태를 확인하세요."}</p></div>
    <Card className="soft-card gap-0">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-5"><div><h2 className="section-heading">문의 내역</h2><p className="section-sub">최근 질문부터 보여 드려요.</p></div>{!loading && <span className="status-pill">{items.length}건</span>}</div>
        {loading ? <div className="space-y-4 p-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> :
          error ? <div className="p-6"><p className="error-box" role="alert">{error}</p><Link className={buttonVariants({ className: "primary-action mt-4" })} href="/">질문하기로 가기 <ArrowRight size={16} /></Link></div> :
          items.length === 0 ? <div className="empty-state"><ClipboardList size={36} /><strong>아직 물어본 게 없어요</strong><p>궁금한 건 언제든 편하게 물어보세요.</p><Link className={buttonVariants({ className: "primary-action mt-4" })} href="/">질문하기 <ArrowRight size={16} /></Link></div> :
          <>
            <div className="desktop-table"><Table><TableHeader><TableRow><TableHead className="pl-6">질문</TableHead><TableHead>결과</TableHead><TableHead>접수 상태</TableHead><TableHead className="pr-6 text-right">문의한 때</TableHead></TableRow></TableHeader>
              <TableBody>{items.map(item => <TableRow key={item.request_id}><TableCell className="max-w-96 py-5 pl-6"><p className="font-medium whitespace-normal">{item.question}</p><span className="request-id">{item.request_id}</span></TableCell><TableCell><RouteBadge route={item.route} /></TableCell><TableCell>{item.ticket ? <div><span className="status-pill">{statusLabel(item.ticket.status)}</span><p className="request-id mt-1">{item.ticket.ticket_id}</p></div> : <span className="text-sm text-muted-foreground">—</span>}</TableCell><TableCell className="pr-6 text-right text-sm text-muted-foreground">{dateLabel(item.created_at)}</TableCell></TableRow>)}</TableBody></Table></div>
            <div className="mobile-cards p-4">{items.map(item => <div className="list-card soft-card" key={item.request_id}><div className="meta-line"><RouteBadge route={item.route} /><span className="request-id">{item.request_id}</span></div><p className="font-medium">{item.question}</p><div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Clock3 size={14} />{dateLabel(item.created_at)}{item.ticket && <span className="ticket-tag">{item.ticket.ticket_id} · {statusLabel(item.ticket.status)}</span>}</div></div>)}</div>
          </>}
      </CardContent>
    </Card>
  </div>;
}
