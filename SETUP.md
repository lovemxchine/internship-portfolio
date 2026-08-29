# คู่มือติดตั้ง — เว็บไซต์บันทึกผลงานฝึกงาน

เว็บนี้เป็น **static site** ไม่มีเซิร์ฟเวอร์ ไม่มีฐานข้อมูล ไฟล์ในโฟลเดอร์ `src/content/`
คือฐานข้อมูลทั้งหมด แก้ผ่านหน้า `/admin/` แล้วมันจะ commit กลับเข้า GitHub เอง

ต้องมี 2 บัญชี ฟรีทั้งคู่ ไม่ต้องผูกบัตร

| บัญชี | ใช้ทำอะไร |
|---|---|
| GitHub | เก็บโค้ดกับข้อมูล build เว็บ และเป็นที่อยู่ของเว็บ |
| Cloudflare | รัน Worker ตัวเล็ก ๆ ที่ทำหน้าที่ตรวจรหัสผ่านและถือโทเคน GitHub ไว้แทนผู้ใช้ |

รันในเครื่องต้องมี **Node 22.12 ขึ้นไป**

---

## 1. GitHub — ย้าย repo และเปิดเว็บ

1. สมัคร https://github.com (ใช้อีเมลอย่างเดียว)
2. ให้เจ้าของเดิมกด Settings → Transfer ownership มาที่บัญชีคุณ
3. Settings → Pages → **Source: GitHub Actions**
4. repo ต้องเป็น **public** (บัญชีฟรีใช้ Pages กับ repo ส่วนตัวไม่ได้)

แก้ 2 บรรทัดบนสุดของ `astro.config.mjs`

```js
const SITE = "https://<ชื่อบัญชี>.github.io";
const BASE = "/<ชื่อ repo>";
```

ที่อยู่เว็บจะเป็น `https://<ชื่อบัญชี>.github.io/<ชื่อ repo>/` — จดไว้ ใช้ในขั้นถัดไป

---

## 2. GitHub — สร้างโทเคนให้ Worker ใช้

หน้า `/admin/` ไม่ได้ถือโทเคนนี้ Worker เป็นคนถือ ผู้ใช้ไม่เคยเห็น

1. https://github.com/settings/personal-access-tokens/new
2. Repository access → **Only select repositories** → เลือก repo นี้ repo เดียว
3. Permissions → Repository permissions → **Contents: Read and write**
4. Generate แล้วคัดลอกไว้ ยังไม่ต้องวางที่ไหน ขั้นที่ 3 จะขอ

---

## 3. Cloudflare — ตั้งรหัสผ่านและ deploy Worker

1. สมัคร https://dash.cloudflare.com
2. แก้ `worker/wrangler.toml` ให้ตรงบัญชีใหม่

```toml
[vars]
GH_REPO = "<ชื่อบัญชี>/<ชื่อ repo>"
ALLOWED_ORIGINS = "https://<ชื่อบัญชี>.github.io,http://localhost:4321"
```

3. รันสคริปต์ตั้งค่า มันจะถามชื่อผู้ใช้ รหัสผ่าน และโทเคนจากขั้นที่ 2
   แล้ว deploy ให้เอง

```bash
npx wrangler login
bash worker/setup.sh
```

รหัสผ่านพิมพ์แล้วไม่ขึ้นจอ และถูกแปลงเป็น SHA-256 ก่อนส่งขึ้น Cloudflare
ตัวรหัสจริงไม่ถูกเก็บที่ไหนเลย ลืมแล้วรัน `setup.sh` ใหม่เพื่อตั้งใหม่

4. จบแล้วจะได้ที่อยู่ Worker เช่น `https://ipf-admin-auth.<ชื่อบัญชี>.workers.dev`

---

## 4. เชื่อมสองฝั่งเข้าหากัน

แก้ `public/admin/settings.json`

```json
{
  "repo": "<ชื่อบัญชี>/<ชื่อ repo>",
  "branch": "main",
  "uploadDir": "src/assets/uploads",
  "authUrl": "https://ipf-admin-auth.<ชื่อบัญชี>.workers.dev"
}
```

commit ขึ้น `main` → GitHub Actions build ให้เอง 1–2 นาที

เข้า `https://<ชื่อบัญชี>.github.io/<ชื่อ repo>/admin/` แล้วล็อกอินด้วยชื่อผู้ใช้
กับรหัสผ่านที่ตั้งไว้ในขั้นที่ 3

---

## รันในเครื่อง

```bash
npm install
npm run dev     # http://localhost:4321
npm test        # ตรวจตัวกันข้อมูลไม่ครบ
```

---

## แก้หน้าตาเว็บ

| อยากแก้ | ไปที่ |
|---|---|
| สี ฟอนต์ ขนาด ระยะห่าง | `src/styles/tokens.css` |
| เทปติดรูป | `public/decor/` (วางไฟล์ PNG ทับชื่อเดิม) |
| ช่องกรอกในหน้า admin | `src/pages/admin/schema.ts` |
| โครงข้อมูล | `src/content.config.ts` |

---

## ข้อควรทราบ

- **repo เป็น public** ข้อมูลและรูปที่ใส่จึงเป็นสาธารณะ ไม่ควรใส่ข้อมูลลับของบริษัท
- วิดีโออัปโหลดเองไม่เกิน 25 MB ต่อคลิป คลิปยาวให้ใช้ลิงก์ YouTube
  เพราะไฟล์วิดีโอจะอยู่ในประวัติ git ถาวร ลบทีหลังก็ยังกินพื้นที่
- ทั้งเว็บต้องไม่เกิน 1 GB
- บัตรผ่านของหน้า admin มีอายุ 14 วัน หมดแล้วล็อกอินใหม่
