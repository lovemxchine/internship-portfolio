# คู่มือติดตั้ง — เว็บไซต์บันทึกผลงานฝึกงาน

เว็บนี้เป็น **static site** ไม่มีเซิร์ฟเวอร์ ไม่มีฐานข้อมูล ไฟล์ในโฟลเดอร์ `src/content/`
คือฐานข้อมูลทั้งหมด แก้ผ่านหน้า `/admin/` แล้วมันจะ commit กลับเข้า GitHub เอง

---

## 1. ย้าย repo มาบัญชีตัวเอง

1. สมัคร GitHub ที่ https://github.com (ฟรี ใช้อีเมลอย่างเดียว)
2. ให้เจ้าของเดิมกด Settings → Transfer ownership มาที่บัญชีคุณ
3. เปิด Settings → Pages ตั้ง **Source: GitHub Actions**

แก้ 2 บรรทัดใน `astro.config.mjs` ให้ตรงบัญชีใหม่

```js
const SITE = "https://<ชื่อบัญชี>.github.io";
const BASE = "/<ชื่อ repo>";
```

แก้ `public/admin/settings.json` ให้ `repo` ตรงกัน

```json
{ "repo": "<ชื่อบัญชี>/<ชื่อ repo>" }
```

commit แล้ว GitHub Actions จะ build ให้เอง 1–2 นาที เว็บขึ้นที่
`https://<ชื่อบัญชี>.github.io/<ชื่อ repo>/`

---

## 2. เข้าหน้าจัดการข้อมูล

```
https://<ชื่อบัญชี>.github.io/<ชื่อ repo>/admin/
```

### แบบง่ายที่สุด — ใช้โทเคน (ไม่ต้องตั้งอะไรเพิ่ม)

1. ไปที่ https://github.com/settings/personal-access-tokens/new
2. Repository access → เลือก repo นี้
3. Permissions → **Contents: Read and write**
4. Generate แล้วคัดลอกมาวางในหน้า `/admin/`

เบราว์เซอร์จำไว้ให้ ไม่ต้องกรอกซ้ำจนกว่าจะกดออกจากระบบ

### แบบกดปุ่มเดียว — เข้าสู่ระบบด้วย GitHub (ตั้งเพิ่ม ~10 นาที)

GitHub ไม่ยอมให้เว็บ static แลกโทเคนเองด้วยเหตุผลด้านความปลอดภัย
ต้องมีตัวกลางเล็ก ๆ คั่น ใช้ Cloudflare Worker ฟรี

1. สมัคร https://dash.cloudflare.com (ฟรี)
2. Workers & Pages → Create → Start from Hello World → วางโค้ดจากไฟล์ `worker/worker.js` ทับ
3. Deploy แล้วจดที่อยู่ที่ได้ เช่น `https://xxx.workers.dev`
4. ไปที่ https://github.com/settings/developers → New OAuth App
   - Homepage URL: ที่อยู่เว็บของคุณ
   - Authorization callback URL: `https://xxx.workers.dev/callback`
5. กลับมาที่ Worker → Settings → Variables and Secrets ใส่
   - `GITHUB_CLIENT_ID` (ค่าธรรมดา)
   - `GITHUB_CLIENT_SECRET` (เลือกชนิด Secret)
6. ใส่ที่อยู่ Worker ลงใน `public/admin/settings.json`

```json
{ "authUrl": "https://xxx.workers.dev" }
```

commit เสร็จ หน้า `/admin/` จะขึ้นปุ่ม **เข้าสู่ระบบด้วย GitHub** แทน

---

## 3. แก้หน้าตาเว็บ

| อยากแก้ | ไปที่ |
|---|---|
| สี ฟอนต์ ขนาด ระยะห่าง | `src/styles/tokens.css` |
| เทปติดรูป | `public/decor/` (วางไฟล์ PNG ทับชื่อเดิม) |
| ฟิลด์ในหน้า admin | `src/pages/admin/schema.ts` |
| โครงข้อมูล | `src/content.config.ts` |

---

## 4. รันในเครื่อง

```bash
npm install
npm run dev
```

เปิด http://localhost:4321 และ http://localhost:4321/admin/

---

## ข้อควรทราบ

- **repo ต้องเป็น public** ถ้าใช้ GitHub บัญชีฟรี ข้อมูลและรูปที่ใส่จึงเป็นสาธารณะ
  ไม่ควรใส่ข้อมูลลับของบริษัท
- วิดีโออัปโหลดเองไม่ควรเกิน 25 MB ต่อคลิป ถ้าคลิปยาวให้ใช้ลิงก์ YouTube
- ทั้งเว็บต้องไม่เกิน 1 GB
