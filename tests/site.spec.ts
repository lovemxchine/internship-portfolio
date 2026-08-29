import { test, expect } from "@playwright/test";

const PAGES = ["/", "/profile", "/weeks", "/gallery", "/summary"];

for (const path of PAGES) {
  test(`หน้า ${path} โหลดได้และมีหัวเรื่อง`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test(`หน้า ${path} ไม่เลื่อนออกด้านข้าง`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);   // ฟอนต์ไทยกว้างกว่า fallback วัดก่อนโหลดเสร็จจะเพี้ยน
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);   // รอให้รูปจัดวางเสร็จก่อนตัดสิน
    // เนื้อหาล้นแนวนอนคือบั๊กที่เห็นชัดที่สุดบนมือถือ

  });
}

test("เม็ดยาใต้เมนูย้ายไปเกาะแท็บที่เปิดอยู่", async ({ page }, info) => {
  // จอเล็กเมนูพับอยู่หลังปุ่มขีดสามขีด เม็ดยาไม่ได้แสดง
  test.skip(info.project.name === "mobile", "เมนูพับบนจอเล็ก");
  await page.goto("/gallery");
  const pill = page.locator(".nav-link.on .pill");
  await expect(pill).toHaveCount(1);
  await expect(page.locator(".nav-link.on")).toContainText("แกลเลอรี");
});

test("ทุกหน้ามีทางเข้าหน้าจัดการข้อมูล", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("a.admin-link")).toHaveAttribute("href", /\/admin\/$/);
});
