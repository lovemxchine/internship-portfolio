/**
 * หลังบ้านของสมุดบันทึกฝึกงาน — Cloudflare Worker
 *
 * ทำสองอย่าง
 *   POST /login       ตรวจชื่อผู้ใช้/รหัสผ่าน แล้วคืนบัตรผ่านที่มีอายุ
 *   ANY  /gh/<path>   ส่งต่อไปยัง GitHub API ด้วยโทเคนที่เก็บไว้ในนี้
 *
 * ผู้ใช้ไม่เคยเห็นโทเคน GitHub เลย ตัวโทเคนไม่ออกจาก Worker
 *
 * ตั้งค่าใน Settings > Variables and Secrets ของ Worker
 *   ALLOWED_ORIGINS    โดเมนเว็บที่เรียกได้ คั่นด้วยจุลภาค (ค่าธรรมดา อยู่ใน wrangler.toml)
 *   ADMIN_USER         ชื่อผู้ใช้
 *   ADMIN_PASS_SHA256  sha-256 ของรหัสผ่าน เป็น hex ตัวพิมพ์เล็ก
 *   SESSION_SECRET     ข้อความสุ่มยาว ๆ ใช้เซ็นบัตรผ่าน
 *   GH_TOKEN           fine-grained token สิทธิ์ Contents: Read and write เฉพาะ repo นี้
 */

const DAY = 86_400;
const SESSION_LIFE = 14 * DAY;

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (text) => hex(await crypto.subtle.digest("SHA-256", enc.encode(text)));

const hmac = async (secret, text) => {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
};

/** เทียบสตริงแบบไม่รั่วเวลา กันการเดาทีละตัวอักษร */
const same = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const makeSession = async (env) => {
  const exp = Math.floor(Date.now() / 1000) + SESSION_LIFE;
  return `${exp}.${await hmac(env.SESSION_SECRET, String(exp))}`;
};

const validSession = async (env, value) => {
  const [exp, sig] = String(value ?? "").split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  return same(sig, await hmac(env.SESSION_SECRET, exp));
};

/** สะท้อน Origin กลับเฉพาะที่อยู่ในรายการ — ไม่ใช่ปล่อยผ่านทุกโดเมน */
const originOf = (request, env) => {
  const list = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  const origin = request.headers.get("Origin") ?? "";
  return list.includes(origin) ? origin : list[0];
};

const cors = (env, request) => ({
  "Access-Control-Allow-Origin": originOf(request, env),
  Vary: "Origin",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
  "Access-Control-Max-Age": "86400",
});

const json = (env, request, body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(env, request) },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, request) });

    if (url.pathname === "/login" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const ok =
        same(String(body.user ?? ""), env.ADMIN_USER) &&
        same(await sha256(String(body.pass ?? "")), env.ADMIN_PASS_SHA256.toLowerCase());
      if (!ok) {
        // ponytail: หน่วงคงที่พอกันเดารหัสด้วยมือ ถ้าโดนยิงอัตโนมัติค่อยเพิ่ม Rate Limiting ของ Cloudflare
        await new Promise((r) => setTimeout(r, 800));
        return json(env, request, { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, 401);
      }
      return json(env, request, { session: await makeSession(env) });
    }

    if (url.pathname.startsWith("/gh/")) {
      const auth = request.headers.get("Authorization")?.replace(/^Bearer /, "");
      if (!(await validSession(env, auth))) return json(env, request, { error: "หมดเวลาเข้าสู่ระบบ" }, 401);

      const target = `https://api.github.com/${url.pathname.slice(4)}${url.search}`;
      const res = await fetch(target, {
        method: request.method,
        headers: {
          Authorization: `Bearer ${env.GH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "ipf-admin",
          "Content-Type": "application/json",
        },
        body: request.method === "GET" ? undefined : await request.text(),
      });
      return new Response(await res.text(), {
        status: res.status,
        headers: { "Content-Type": "application/json; charset=utf-8", ...cors(env, request) },
      });
    }

    return json(env, request, { error: "ไม่พบปลายทางนี้" }, 404);
  },
};
