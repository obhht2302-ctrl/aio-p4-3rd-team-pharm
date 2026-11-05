"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// 태블릿에서 손가락으로 옆으로 넘기는 단계 화면. 위쪽 단계 버튼과 화살표로도 넘길 수 있어요.
export function Pager({
  steps,
  index,
  onIndex,
  children,
}: {
  steps: string[];
  index: number;
  onIndex: (n: number) => void;
  children: React.ReactNode;
}) {
  const box = React.useRef<HTMLDivElement>(null);
  const settle = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const first = React.useRef(true);

  // 처음에는 애니메이션 없이 그 단계로, 그다음부터는 부드럽게 넘겨요.
  React.useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const left = index * el.clientWidth;
    if (first.current) {
      first.current = false;
      el.scrollLeft = left;
      return;
    }
    if (Math.abs(el.scrollLeft - left) < 2) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left, behavior: calm ? "auto" : "smooth" });
    // 부드러운 넘김이 중간에 멈추면 그 단계에 맞춰 줘요.
    const fix = setTimeout(() => {
      if (Math.abs(el.scrollLeft - left) >= 2) el.scrollLeft = left;
    }, 700);
    return () => clearTimeout(fix);
  }, [index]);

  // 화면을 돌리거나 창 크기가 바뀌면 지금 단계에 다시 맞춰요.
  const current = React.useRef(index);
  current.current = index;
  React.useEffect(() => {
    const el = box.current;
    if (!el) return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      el.scrollLeft = current.current * width;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = box.current;
      if (!el || !el.clientWidth) return;
      const n = Math.round(el.scrollLeft / el.clientWidth);
      if (n !== index) onIndex(n);
    }, 120);
  };

  const arrow = "pager-arrow grid size-12 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-foreground/10 transition-transform active:scale-95 disabled:opacity-30";

  return (
    <div className="pager-wrap">
      {/* 단계 버튼 줄은 위에 고정, 단계 화면은 남은 높이를 꽉 채워요 */}
      <div className="flex flex-none items-center gap-2">
        <button type="button" aria-label="이전 단계" className={arrow} disabled={index === 0} onClick={() => onIndex(index - 1)}>
          <ChevronLeft className="size-6" />
        </button>
        <ol className="pager-steps flex min-w-0 flex-1 gap-2">
          {steps.map((s, i) => (
            <li key={s} className="min-w-0 flex-1">
              <button
                type="button"
                aria-current={i === index ? "step" : undefined}
                onClick={() => onIndex(i)}
                className={cn(
                  "pager-step flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-2 text-[15px] font-semibold transition-transform active:scale-[0.98]",
                  i === index ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-foreground/10"
                )}
              >
                <span className="step-no tabular-nums">{i + 1}</span>
                <span className="step-name truncate">{s}</span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" aria-label="다음 단계" className={arrow} disabled={index === steps.length - 1} onClick={() => onIndex(index + 1)}>
          <ChevronRight className="size-6" />
        </button>
      </div>
      <div ref={box} onScroll={onScroll} className="pager">
        {React.Children.map(children, (child) => (
          <PagerPage>{child}</PagerPage>
        ))}
      </div>
    </div>
  );
}

// 상자 안 스크롤: 아래에 더 있으면 data-more를 붙여 바닥에 살짝 그림자를 보여 줘요 (태블릿은 스크롤바가 안 보여서).
export function useMoreBelow<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => el.toggleAttribute("data-more", el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); mo.disconnect(); };
  }, []);
  return ref;
}

export function ScrollBox({ className, ...props }: React.ComponentProps<"div">) {
  const ref = useMoreBelow<HTMLDivElement>();
  return <div ref={ref} className={cn("scroll-box", className)} {...props} />;
}

function PagerPage({ children }: { children: React.ReactNode }) {
  const ref = useMoreBelow<HTMLElement>();
  return <section ref={ref} className="pager-page scroll-box">{children}</section>;
}
