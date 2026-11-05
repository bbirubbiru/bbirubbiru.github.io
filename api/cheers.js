// Vercel 서버리스 함수: 프로젝트 응원 보드
//   GET  /api/cheers           -> { counts: { "project-01": 3, ... } }
//   POST /api/cheers {project_id} -> { ok: true, project_id, count }
//
// 저장소: Supabase (PostgREST REST API 를 fetch 로 직접 호출. 외부 패키지 불필요)
// 환경 변수(값은 Vercel 대시보드에서 입력, 코드에 넣지 않음):
//   SUPABASE_URL         예) https://xxxx.supabase.co
//   SUPABASE_SECRET_KEY  service_role(secret) 키 — 서버 전용, 브라우저 노출 금지

// 서버에서 허용하는 프로젝트 식별자 화이트리스트 (이 외는 거절)
const ALLOWED = new Set(["project-01", "project-02", "project-03", "project-04"]);

function getEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("missing_env"); // 키 값은 로그에 남기지 않는다
  }
  return { url: url.replace(/\/$/, ""), key };
}

function sbHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

// project_id 별 누적 개수 집계
async function getCounts(env) {
  const counts = {};
  for (const pid of ALLOWED) counts[pid] = 0;

  // head=true + Prefer: count=exact 로 각 project_id 의 행 수만 받아온다
  await Promise.all(
    [...ALLOWED].map(async (pid) => {
      const url =
        `${env.url}/rest/v1/cheers?select=id&project_id=eq.${encodeURIComponent(pid)}`;
      const r = await fetch(url, {
        method: "HEAD",
        headers: { ...sbHeaders(env.key), Prefer: "count=exact" },
      });
      if (!r.ok) throw new Error("supabase_query_failed");
      // content-range 예: "0-24/25" 또는 "*/25"
      const range = r.headers.get("content-range") || "";
      const total = range.includes("/") ? parseInt(range.split("/")[1], 10) : 0;
      counts[pid] = Number.isFinite(total) ? total : 0;
    })
  );
  return counts;
}

async function insertCheer(env, projectId) {
  const r = await fetch(`${env.url}/rest/v1/cheers`, {
    method: "POST",
    headers: { ...sbHeaders(env.key), Prefer: "return=minimal" },
    body: JSON.stringify({ project_id: projectId }),
  });
  if (!r.ok) throw new Error("supabase_insert_failed");
}

async function countOne(env, projectId) {
  const url =
    `${env.url}/rest/v1/cheers?select=id&project_id=eq.${encodeURIComponent(projectId)}`;
  const r = await fetch(url, {
    method: "HEAD",
    headers: { ...sbHeaders(env.key), Prefer: "count=exact" },
  });
  if (!r.ok) throw new Error("supabase_query_failed");
  const range = r.headers.get("content-range") || "";
  const total = range.includes("/") ? parseInt(range.split("/")[1], 10) : 0;
  return Number.isFinite(total) ? total : 0;
}

export default async function handler(req, res) {
  try {
    const env = getEnv();

    if (req.method === "GET") {
      const counts = await getCounts(env);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ counts });
    }

    if (req.method === "POST") {
      // body 파싱 (Vercel 은 보통 req.body 를 자동 파싱하지만, 문자열일 수도 있다)
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const projectId = body && body.project_id;

      // 서버 측 검증: 허용된 값만 저장
      if (!projectId || typeof projectId !== "string" || !ALLOWED.has(projectId)) {
        return res.status(400).json({ ok: false, error: "invalid_project_id" });
      }

      await insertCheer(env, projectId);
      const count = await countOne(env, projectId);
      return res.status(200).json({ ok: true, project_id: projectId, count });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  } catch (e) {
    const msg = e && e.message === "missing_env" ? "server_not_configured" : "server_error";
    // 비밀 키/민감정보는 응답/로그에 포함하지 않는다
    return res.status(500).json({ ok: false, error: msg });
  }
}
