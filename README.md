# สมุดบันทึกฝึกงาน — เว็บไซต์บันทึกผลงานรายสัปดาห์

เว็บสำเร็จรูป แก้เนื้อหาทั้งหมดผ่านหน้าเว็บ ไม่ต้องเขียนโค้ด ไม่ต้องลงโปรแกรม
ค่าใช้จ่าย 0 บาท ไม่ต้องผูกบัตร

---

# ติดตั้งครั้งแรก (ทำครั้งเดียว ~20 นาที)

ทำตามลำดับ ห้ามข้าม เปิดหน้าต่างเบราว์เซอร์ทิ้งไว้หลายแท็บได้

## 1 · สมัคร GitHub

ไปที่ https://github.com/signup ใช้อีเมลอย่างเดียว จำ **ชื่อบัญชี (username)** ไว้

## 2 · คัดลอกเว็บมาไว้ที่บัญชีคุณ

1. เปิด https://github.com/lovemxchine/internship-portfolio-template
2. กดปุ่มเขียว **Use this template** → **Create a new repository**
3. ช่อง Repository name พิมพ์ `internship-portfolio`
4. เลือก **Public** (จำเป็น — บัญชีฟรีเปิดเว็บจาก repo ส่วนตัวไม่ได้)
5. กด **Create repository**

ที่อยู่เว็บของคุณจะเป็น `https://<ชื่อบัญชี>.github.io/internship-portfolio/`

## 3 · เปิดเว็บ

ใน repo ที่เพิ่งสร้าง → แท็บ **Settings** → เมนูซ้าย **Pages**
→ ช่อง Source เลือก **GitHub Actions** → เสร็จ

รอ 2 นาที แล้วลองเปิดที่อยู่เว็บข้างบน ต้องเห็นหน้าเว็บเปล่า ๆ

## 4 · สร้างกุญแจให้เว็บเขียนข้อมูลได้

1. เปิด https://github.com/settings/personal-access-tokens/new
2. Token name พิมพ์อะไรก็ได้ เช่น `portfolio`
3. Expiration เลือก **No expiration** (ถ้าเลือกวันหมดอายุ พอถึงวันนั้นเว็บจะบันทึกไม่ได้)
4. Repository access → **Only select repositories** → เลือก `internship-portfolio`
5. Permissions → Repository permissions → หา **Contents** → เปลี่ยนเป็น **Read and write**
6. กด **Generate token** แล้ว **คัดลอกเก็บไว้** (ปิดหน้านี้แล้วจะดูไม่ได้อีก)

## 5 · ตั้งรหัสผ่านสำหรับเข้าหลังบ้าน

เปิด `https://<ชื่อบัญชี>.github.io/internship-portfolio/admin/setup/`

พิมพ์รหัสผ่านที่อยากใช้ หน้านี้จะแปลงให้ 2 ค่า กดปุ่มคัดลอกทั้งสองค่าเก็บไว้
รหัสผ่านจริงไม่ถูกส่งไปไหนเลย แปลงในเครื่องคุณเอง

## 6 · สมัคร Cloudflare แล้วกดปุ่มเดียว

1. สมัคร https://dash.cloudflare.com/sign-up (อีเมลอย่างเดียว)
2. กลับมาที่ repo ของคุณ กดปุ่มนี้ในหน้า README ของ **repo ตัวเอง**

   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lovemxchine/internship-portfolio-template/tree/main/worker)

3. ระบบจะถามค่า 4 ช่อง กรอกตามนี้

   | ช่อง | ใส่อะไร |
   |---|---|
   | `ADMIN_USER` | ชื่อผู้ใช้ที่อยากใช้เข้าหลังบ้าน เช่น `admin` |
   | `ADMIN_PASS_SHA256` | ค่าที่ 1 จากขั้นที่ 5 |
   | `SESSION_SECRET` | ค่าที่ 2 จากขั้นที่ 5 |
   | `GH_TOKEN` | กุญแจจากขั้นที่ 4 |

4. กด Deploy รอสักครู่ จะได้ที่อยู่หน้าตาแบบ
   `https://ipf-admin-auth.<ชื่ออะไรสักอย่าง>.workers.dev` — **คัดลอกเก็บไว้**

## 7 · บอกให้ Worker รู้จัก repo คุณ

ที่หน้า Worker → **Settings** → **Variables and Secrets** → หาบรรทัด `GH_REPO`
→ แก้ค่าเป็น `<ชื่อบัญชี>/internship-portfolio` → **Deploy**

## 8 · เชื่อมเว็บเข้ากับ Worker (แก้ 1 บรรทัด)

1. ใน repo ของคุณ เปิดไฟล์ `public/admin/settings.json`
2. กดรูปดินสอ ✏️ มุมขวาบน
3. แก้บรรทัด `"authUrl"` ให้เป็นที่อยู่ Worker จากขั้นที่ 6
4. กด **Commit changes**

## 9 · เข้าใช้งาน

รอ 2 นาที แล้วเปิด
`https://<ชื่อบัญชี>.github.io/internship-portfolio/admin/`
ล็อกอินด้วยชื่อผู้ใช้และรหัสผ่านจากขั้นที่ 5

**ติดตั้งเสร็จแล้ว** ที่เหลือคือกรอกข้อมูล

---

# ใช้งานประจำวัน

เข้า `.../admin/` → เลือกแท็บ → แก้ → กด **บันทึก** → รอ 1–2 นาที เว็บอัปเดตเอง

- แท็บ **ประวัติส่วนตัว** — ชื่อ รูป บริษัท ช่วงเวลาฝึก
- แท็บ **รายสัปดาห์** — กดเพิ่มสัปดาห์ใหม่ ใส่งาน ขั้นตอน สิ่งที่ได้เรียนรู้ และรูป
- แท็บ **แกลเลอรี** — รูปหรือคลิปที่ไม่ผูกกับสัปดาห์ไหน
- แท็บ **สรุปผล** — สรุปตอนจบฝึกงาน

รูปย่อขนาดให้อัตโนมัติ ไม่ต้องย่อเอง

---

# เรื่องที่ต้องรู้

- **repo เป็นสาธารณะ** ใครก็เห็นข้อมูลและรูปที่ใส่ อย่าใส่ความลับของบริษัท
- คลิปวิดีโออัปโหลดเองไม่เกิน 25 MB ต่อไฟล์ ยาวกว่านั้นให้วางลิงก์ YouTube แทน
- ลืมรหัสผ่าน → ทำขั้นที่ 5 ใหม่ แล้วเอาค่าไปแก้ที่ Worker (Settings → Variables and Secrets)
- กดบันทึกแล้วเว็บไม่เปลี่ยน → รอครบ 2 นาทีก่อน ถ้ายังไม่เปลี่ยนให้ดูแท็บ **Actions** ใน repo ว่ามีกากบาทแดงไหม
- บัตรผ่านหน้าหลังบ้านมีอายุ 14 วัน หมดแล้วล็อกอินใหม่

---

# สำหรับนักพัฒนา

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # ตัวตรวจข้อมูลไม่ครบ
npx playwright test
```

| อยากแก้ | ไปที่ |
|---|---|
| สี ฟอนต์ ระยะห่าง | `src/styles/tokens.css` |
| ช่องกรอกในหน้าหลังบ้าน | `src/pages/admin/schema.ts` |
| โครงข้อมูล | `src/content.config.ts` |
| ตัวตรวจรหัสผ่าน / พร็อกซี GitHub | `worker/worker.js` |

`site` และ `base` อ่านจาก `GITHUB_REPOSITORY` ตอน build ย้ายบัญชีไม่ต้องแก้ไฟล์
