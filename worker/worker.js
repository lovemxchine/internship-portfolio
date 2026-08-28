/**
 * ตัวกลางสำหรับ "เข้าสู่ระบบด้วย GitHub" — Cloudflare Worker (ฟรี)
 * มีหน้าที่เดียว: แลก code เป็น access token เพราะเบราว์เซอร์ยิงตรงไม่ได้ (CORS)
 *
 * ตั้ง 2 ค่าใน Settings > Variables and Secrets ของ Worker:
 *   GITHUB_CLIENT_ID     (ค่าธรรมดา)
 *   GITHUB_CLIENT_SECRET (แบบ Secret)
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1) พาไปหน้าอนุญาตของ GitHub
    if (url.pathname === "/auth") {
      const to = new URL("https://github.com/login/oauth/authorize");
      to.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      to.searchParams.set("scope", "repo");
      to.searchParams.set("redirect_uri", `${url.origin}/callback`);
      return Response.redirect(to.toString(), 302);
    }

    // 2) GitHub ส่งกลับมาพร้อม code — แลกเป็น token แล้วส่งกลับหน้าที่เปิด popup
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("ไม่มี code", { status: 400 });

      const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const data = await res.json();
      const payload = JSON.stringify({
        source: "ipf-admin-auth",
        token: data.access_token ?? null,
        error: data.error_description ?? data.error ?? null,
      });

      return new Response(
        `<!doctype html><meta charset="utf-8"><title>กำลังเข้าสู่ระบบ…</title>
         <body style="font-family:system-ui;padding:2rem">กำลังเข้าสู่ระบบ… ปิดหน้าต่างนี้ได้เลย
         <script>
           window.opener && window.opener.postMessage(${payload}, "*");
           window.close();
         </script></body>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    return new Response("ok");
  },
};
