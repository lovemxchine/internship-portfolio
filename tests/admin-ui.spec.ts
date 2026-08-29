import { test, expect, type Page } from "@playwright/test";

/* เข้าหลังบ้านจริงต้องใช้รหัสผ่าน เทสต์ชุดนี้จึงตรวจเฉพาะกฎ CSS
   โดยวางโครง DOM ชุดเดียวกับที่ admin-client สร้างจริง */
const mount = (page: Page, html: string) =>
  page.evaluate((markup) => {
    const host = document.createElement("div");
    host.id = "probe";
    host.innerHTML = markup;
    document.querySelector(".wrap")!.appendChild(host);
  }, html);

test.beforeEach(async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.locator("#loginform")).toBeVisible();
});

test("ฟอร์มเข้าสู่ระบบมีระยะห่างระหว่างช่อง ไม่ติดกันสนิท", async ({ page }) => {
  const gaps = await page.evaluate(() => {
    const kids = [...document.querySelectorAll("#loginform > *")].map((n) => n.getBoundingClientRect());
    return kids.slice(1).map((r, i) => r.top - kids[i].bottom);
  });
  expect(gaps.length).toBeGreaterThan(0);
  for (const g of gaps) expect(g).toBeGreaterThan(8);
});

test("ปุ่มเพิ่มรายการกว้างเท่าข้อความ ไม่ยืดเต็มช่อง", async ({ page }) => {
  await mount(page, '<div class="sub"><span>ทักษะ</span><button class="ghost">+ เพิ่ม</button></div>');
  const box = page.locator("#probe .sub");
  const btn = page.locator("#probe .sub > button");
  const boxW = (await box.boundingBox())!.width;
  const btnW = (await btn.boundingBox())!.width;
  expect(btnW).toBeLessThan(boxW * 0.75);
});

test("กล่องรายการเว้นระยะระหว่างชิ้นข้างใน", async ({ page }) => {
  await mount(page, '<div class="sub"><span>ทักษะ</span><div class="line imgrow"><input /></div><button class="ghost">+ เพิ่ม</button></div>');
  const gaps = await page.evaluate(() => {
    const kids = [...document.querySelectorAll("#probe .sub > *")].map((n) => n.getBoundingClientRect());
    return kids.slice(1).map((r, i) => r.top - kids[i].bottom);
  });
  for (const g of gaps) expect(g).toBeGreaterThan(8);
});

test("แถบบันทึกมีพื้นหลังกินเต็มความกว้างจอ", async ({ page }) => {
  await mount(page, '<div style="height:900px"></div><div class="sticky-save row"><button class="stamp">บันทึกลงเว็บ</button></div>');
  const { bandW, viewportW } = await page.evaluate(() => {
    const bar = document.querySelector("#probe .sticky-save")!;
    return {
      bandW: parseFloat(getComputedStyle(bar, "::before").width),
      viewportW: document.documentElement.clientWidth,
    };
  });
  // ::before ต้องกว้างเท่าจอ ไม่ใช่เท่าคอลัมน์เนื้อหา ไม่งั้นลายจุดโผล่ข้าง ๆ
  expect(bandW).toBeGreaterThanOrEqual(viewportW - 1);
});

test("แถบบันทึกเว้นบนล่างเท่ากัน", async ({ page }) => {
  await mount(page, '<div class="sticky-save row"><button class="stamp">บันทึกลงเว็บ</button></div>');
  const { top, bottom } = await page.evaluate(() => {
    const bar = document.querySelector("#probe .sticky-save")!;
    const btn = bar.querySelector(".stamp")!.getBoundingClientRect();
    const box = bar.getBoundingClientRect();
    return { top: btn.top - box.top, bottom: box.bottom - btn.bottom };
  });
  expect(Math.abs(top - bottom)).toBeLessThan(1);
});

test("ปุ่มเลือกไฟล์เป็นภาษาไทย ไม่ใช่ปุ่มดิบของเบราว์เซอร์", async ({ page }) => {
  await mount(page, '<label class="pickbtn">เลือกรูป<input type="file" class="sr-only" /></label>');
  await expect(page.locator("#probe .pickbtn")).toContainText("เลือกรูป");
  // input ตัวจริงต้องถูกซ่อน ไม่งั้นจะเห็น Choose File ซ้อน
  const w = (await page.locator("#probe input[type=file]").boundingBox())!.width;
  expect(w).toBeLessThan(5);
});
