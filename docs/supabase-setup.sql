-- =============================================================
-- 프로젝트 응원 보드 — Supabase 테이블 생성 SQL
-- 실행 위치: Supabase 대시보드 → SQL Editor → New query → 붙여넣고 Run
-- 안전: IF NOT EXISTS 사용. 기존 테이블/데이터를 삭제(DROP/TRUNCATE)하지 않음.
-- =============================================================

-- 1) 응원 반응을 한 건씩 저장하는 테이블
create table if not exists public.cheers (
  id          bigint generated always as identity primary key,
  project_id  text        not null,
  created_at  timestamptz not null default now()
);

-- 2) 집계(project_id 별 count)와 정렬을 빠르게 하기 위한 인덱스
create index if not exists cheers_project_id_idx on public.cheers (project_id);

-- 3) RLS(행 수준 보안) 켜기
--    브라우저가 anon 키로 이 테이블에 직접 접근하지 못하게 한다.
--    저장/조회는 모두 서버 함수가 service_role(secret) 키로 수행한다.
--    service_role 키는 RLS를 우회하므로, 아래처럼 정책을 추가하지 않아도
--    서버 함수는 동작한다. (= 공개 브라우저 직접 접근은 막힌 상태가 기본)
alter table public.cheers enable row level security;

-- (정책을 일부러 추가하지 않는다. 공개 anon 접근은 차단된 상태가 맞다.)

-- =============================================================
-- 확인:
--  - Table Editor 에서 public.cheers 테이블과 3개 열(id, project_id, created_at)이 보이면 성공.
--  - Authentication/Policies 에서 cheers 의 RLS 가 Enabled 인지 확인.
-- =============================================================
