/* Astro dev แปลงรูปตอนมีคนขอหน้านั้นครั้งแรก คำขอแรกจึงช้าเป็นหลักสิบวินาที
   เรียกทุกหน้าทีละหน้าก่อนเริ่มเทสต์ เพื่อไม่ให้ความช้ารอบแรกไปตกใส่เทสต์ตัวใดตัวหนึ่ง */
const PATHS = ["/", "/profile", "/weeks", "/gallery", "/summary", "/admin/"];

export default async function warmup(): Promise<void> {
  for (const p of PATHS) {
    const res = await fetch(`http://localhost:4321${p}`);
    if (!res.ok) throw new Error(`อุ่นเครื่องหน้า ${p} ไม่ผ่าน (${res.status})`);
    await res.text();
  }
}
