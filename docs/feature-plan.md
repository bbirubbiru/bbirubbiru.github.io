# 기능 계획 — 프로젝트 응원 보드 (Cheer Board)

## 다섯 문장 요약
- 내 홈페이지는 나의 비즈니스·기술 포트폴리오를 보여주는 곳이다.
- 방문자는 관심 있는 프로젝트에 응원(👏) 버튼을 누른다.
- 서버에는 프로젝트 번호와 저장 시각을 반응 1건씩 저장한다.
- 저장 후 화면에는 프로젝트별 누적 응원 수가 보인다.
- 다른 기기에서도 같은 집계가 보이고 재배포 후에도 유지되면 완성이다.

## 배포/저장 조합
- 배포 서비스: **Vercel** (정적 `index.html` + `api/` 서버리스 함수. 빌드 없음, 설정 최소)
- 데이터 저장: **Supabase** (PostgreSQL 테이블 `cheers`)
- 흐름: 브라우저 → Vercel 서버 함수(`/api/cheers`) → Supabase

## 화면 (index.html PROJECTS 섹션)
- 프로젝트 4개(project-01 ~ project-04) 각각에 `👏 응원` 버튼과 누적 횟수 표시.
- 페이지가 열리면 GET으로 집계를 불러와 각 숫자를 채운다.
- 버튼을 누르면: 버튼 잠시 비활성화 → POST 전송 → 성공 시 해당 숫자 +1, "응원이 저장되었습니다" 안내 → 실패 시 실패 안내(성공처럼 표시하지 않음).

## 저장할 데이터 (테이블 cheers)
| 열 | 타입 | 설명 |
|---|---|---|
| id | bigint (자동 증가) | 반응 한 건의 고유 번호 |
| project_id | text | 작품/프로젝트 식별자 (예: project-01) |
| created_at | timestamptz (기본값 now()) | 저장 시각 |

- 숫자 하나를 덮어쓰지 않고 반응을 한 건씩 저장(INSERT)한 뒤 COUNT로 집계한다.
- 집계 결과 예: project-01 → 3, project-02 → 5 ...

## API 설계 (같은 사이트 내 /api/cheers)
- `GET /api/cheers` → `{ counts: { "project-01": 3, "project-02": 5, ... } }`
- `POST /api/cheers` body `{ "project_id": "project-01" }` → `{ ok: true, project_id, count }`
  - 서버가 허용된 project_id(아래 화이트리스트)만 수락. 그 외는 400으로 거절.

## 허용 project_id (서버에서 검증)
project-01, project-02, project-03, project-04 — 이 4개만 저장 허용.

## 환경 변수 (이름만; 값은 대시보드에서 직접 입력)
- `SUPABASE_URL` — Supabase 프로젝트 URL (서버 전용)
- `SUPABASE_SECRET_KEY` — Supabase service_role(secret) 키 (서버 전용, 브라우저에 절대 노출 금지)

> 비밀 키는 서버 함수에서만 사용. VITE_ / NEXT_PUBLIC_ 같은 공개 접두어에 넣지 않는다.

## 최소 완성 기준
- [ ] 프로젝트 4개 중 하나를 누르면 서버 저장 성공 후 숫자가 갱신된다.
- [ ] 다른 기기/브라우저에서 새로고침하면 같은 집계가 보인다.
- [ ] 없는 project_id를 보내면 서버가 저장을 거절한다(400).
- [ ] 저장 실패 시 성공 메시지를 띄우지 않는다.
- [ ] 재배포 후에도 기록이 남는다.

## 검사 방법 (직접 실행)
1. 로컬 `vercel dev` 실행 → project-01에 PC로 1회, (배포 후) 휴대폰으로 1회 → 두 화면 모두 2회인지 확인.
2. 개발자도구 Network에서 POST 응답이 200인지, 실패 시 화면에 실패 안내가 뜨는지 확인.
3. 잘못된 project_id(예: project-99)를 POST하면 400으로 거절되는지 확인(curl 또는 콘솔).
4. Supabase Table Editor에서 cheers 테이블에 행이 쌓이는지 확인.

주의: 이것은 누적 반응 횟수다. 중복 참여가 가능하므로 "방문자 N명"이나 "1인 1표"로 표현하지 않는다.
