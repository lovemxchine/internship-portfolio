// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// ตอน build บน GitHub Actions ตัว GITHUB_REPOSITORY บอกอยู่แล้วว่า repo นี้ของใคร ชื่ออะไร
// อ่านจากตรงนั้นเลย ย้ายไปบัญชีไหนก็ไม่ต้องมาแก้ไฟล์นี้
const [OWNER, REPO] = (process.env.GITHUB_REPOSITORY ?? "lovemxchine/internship-portfolio").split("/");
const SITE = `https://${OWNER}.github.io`;
const BASE = `/${REPO}`;

// ตอน dev เสิร์ฟที่ / เฉย ๆ จะได้ไม่ต้องพิมพ์ path ยาว
// ตอน build ใช้ BASE จริงเพราะ GitHub Pages เป็น project site
const isBuild = process.env.NODE_ENV === "production";

export default defineConfig({
  site: SITE,
  base: isBuild ? BASE : "/",
  trailingSlash: "ignore",
  integrations: [sitemap()],
  image: { responsiveStyles: true },
});
