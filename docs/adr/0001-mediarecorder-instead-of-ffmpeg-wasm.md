# บีบอัดวิดีโอด้วย MediaRecorder ไม่ใช่ ffmpeg.wasm

หลังบ้านต้องบีบคลิปจากมือถือ (มัก 100 MB+ ต่อ 1 นาที) ให้เหลือต่ำกว่า 25 MB
ก่อนอัปเข้า repo เราเลือกวิธีเล่นคลิปแล้วอัดซ้ำผ่าน `HTMLVideoElement.captureStream()`
+ `MediaRecorder` ที่ bitrate ต่ำ แทนการโหลด ffmpeg.wasm

## Considered Options

- **ffmpeg.wasm** — คุณภาพดีกว่า ได้ mp4 ตรง ๆ และบีบเร็วกว่าเวลาจริง
  แต่ต้องโหลด binary ~30 MB ทุกครั้งที่เปิดหน้า admin และต้องการ header
  `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` เพื่อใช้
  SharedArrayBuffer — **GitHub Pages ตั้ง response header ไม่ได้** ข้อนี้เป็นตัวตัดสิน
- **รับเฉพาะลิงก์ YouTube** — ไม่ต้องเขียนโค้ดบีบอัดเลย แต่ลูกค้ายืนยันว่าต้องการ
  อัปคลิปสั้นเข้าเว็บเองด้วย

## Consequences

- การบีบใช้เวลาเท่าความยาวคลิป เพราะเป็นการอัดขณะเล่นจริง ห้ามสลับแท็บระหว่างนั้น
- ไฟล์ที่ได้เป็น WebM บน Chrome/Android และ MP4 บน Safari — `<video>` เล่นได้ทั้งคู่
  แต่ไฟล์ในแกลเลอรีจะมีนามสกุลไม่เหมือนกันขึ้นกับเครื่องที่อัป
- คุณภาพต่ำกว่า ffmpeg ที่ bitrate เท่ากัน ยอมรับได้เพราะเป็นคลิปประกอบรายงาน
