// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// เปลี่ยน 2 ค่านี้ตอนย้าย repo ไปบัญชีลูกค้า
const SITE = "https://lovemxchine.github.io";
const BASE = "/internship-portfolio";

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: "ignore",
  integrations: [sitemap()],
  image: { responsiveStyles: true },
});
