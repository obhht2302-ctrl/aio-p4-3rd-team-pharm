-- [병훈님이 정함] PostgreSQL 표 초안 — 칸 · 색인 · 기본키는 바꿔도 됨. 연락처 · 질문 원문을 어디까지 남길지 같이 정할 것.
CREATE SEQUENCE IF NOT EXISTS team3_ticket_seq START 3001;
CREATE TABLE IF NOT EXISTS requests (
  request_id  text PRIMARY KEY,
  "user"      text NOT NULL,
  question    text NOT NULL,            -- 화면 '내 문의'용. 로그 · 알림에는 쓰지 않음
  route       text,
  ticket_id   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tickets (
  ticket_id   text PRIMARY KEY,
  key         text NOT NULL UNIQUE,     -- 멱등 키 = request_id
  title       text NOT NULL,
  requester   text NOT NULL,
  category    text NOT NULL,            -- Type policy 의 type (recall · closing · senior · other …)
  priority    text NOT NULL DEFAULT 'normal',
  product     text NOT NULL DEFAULT '', -- 회수 티켓의 제품 코드 (손님 연락처와 같은 표에 두지 않음)
  status      text NOT NULL DEFAULT '접수됨',
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS alerts (
  id          bigserial PRIMARY KEY,
  workflow    text, node text, severity text, reason text, message text, ticket_id text,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stock (       -- 품절 팩을 켤 때만
  product     text PRIMARY KEY,
  qty         integer NOT NULL,
  next_in     text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS notices (     -- 회수 손님 안내 연습 기록 (발송 없음). 약 이름 · 연락처 원문을 두지 않음
  id          bigserial PRIMARY KEY,
  ticket_id   text NOT NULL REFERENCES tickets(ticket_id),
  customer_id text NOT NULL,
  phone_masked text NOT NULL,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'practice_logged',
  at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, customer_id)
);
