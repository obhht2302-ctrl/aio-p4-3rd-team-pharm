import { cn } from "@/lib/utils";

// 약사 두 분은 가운을 입은 가상 인물 일러스트로 보여 줘요 (실제 인물 얼굴을 본뜨지 않았어요).
// 나머지 사람은 이름 첫 글자 동그라미예요.
const FACE = "#F1D2B6";

function PharmacistArt({ who }: { who: "이서준" | "정민재" }) {
  const seo = who === "이서준";
  return (
    <svg viewBox="0 0 64 64" aria-hidden className="size-full">
      <rect width="64" height="64" fill={seo ? "#DCEBE5" : "#E3E7F0"} />
      {/* 가운 */}
      <path d="M8 64c0-13 9-21 24-21s24 8 24 21z" fill="#FFFFFF" stroke="#C9D2CE" strokeWidth="1" />
      {/* 셔츠 · 넥타이 */}
      <path d="M25 43.5 32 56l7-12.5c-2-.7-4.4-1-7-1s-5 .3-7 1z" fill={seo ? "#BFD9F0" : "#D9D4EA"} />
      <path d="M31 46h2l1 9-2 3-2-3z" fill={seo ? "#2F6F5E" : "#2E4A7D"} />
      {/* 가운 깃 */}
      <path d="M25 43.5 22 50l7 8 3-2zM39 43.5 42 50l-7 8-3-2z" fill="#F4F6F5" stroke="#C9D2CE" strokeWidth="0.8" />
      {/* 이름표 */}
      <rect x="40" y="52" width="9" height="4" rx="1" fill={seo ? "#2F6F5E" : "#2E4A7D"} />
      {/* 목 · 얼굴 */}
      <rect x="28.5" y="36" width="7" height="8" rx="3" fill={FACE} />
      <ellipse cx="32" cy="27" rx="10.5" ry="12" fill={FACE} />
      {/* 머리 */}
      {seo ? (
        <path d="M21.4 25c-.6-8 4.4-13 10.8-13 6.8 0 11.4 4.6 10.6 13-1.8-4.6-5-6.6-10.4-6.6-4.6 0-8 1.8-11 6.6z" fill="#2B2420" />
      ) : (
        <path d="M21.6 26c-1-8.6 4-14 10.6-14 6.4 0 11.6 4.8 10.4 14-1.2-3.4-3.4-5.8-6-6.6-2.4 1.6-6.4 2.4-10.4 2-2.2 1-3.6 2.6-4.6 4.6z" fill="#6E6A66" />
      )}
      {/* 눈 · 입 */}
      <circle cx="28" cy="28" r="1.1" fill="#2B2420" />
      <circle cx="36" cy="28" r="1.1" fill="#2B2420" />
      <path d="M29 33.4c1.8 1.4 4.2 1.4 6 0" stroke="#B4785A" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {/* 안경 (정민재) */}
      {!seo && (
        <g fill="none" stroke="#3B3B3B" strokeWidth="0.9">
          <rect x="24.6" y="25.4" width="6.6" height="5" rx="2" />
          <rect x="32.8" y="25.4" width="6.6" height="5" rx="2" />
          <path d="M31.2 27.4h1.6" />
        </g>
      )}
    </svg>
  );
}

export function PersonAvatar({ name, className }: { name: string; className?: string }) {
  if (name === "이서준" || name === "정민재") {
    return (
      <span className={cn("inline-grid shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/10", className)} role="img" aria-label={`${name} 프로필 그림`}>
        <PharmacistArt who={name} />
      </span>
    );
  }
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-full bg-secondary font-bold text-primary", className)} aria-hidden>
      {name.slice(0, 1)}
    </span>
  );
}
