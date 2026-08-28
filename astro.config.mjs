// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// เปลี่ยน 2 ค่านี้ตอนย้าย repo ไปบัญชีลูกค้า
const SITE = "https://lovemxchine.github.io";
const BASE = "/internship-portfolio";

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
