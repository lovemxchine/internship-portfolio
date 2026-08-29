/* ตรวจตัวกันข้อมูลไม่ครบ — node --experimental-strip-types tests/problems.test.ts */
import assert from "node:assert/strict";
import { allProblems } from "../src/pages/admin/admin-client.ts";
import { COLLECTIONS } from "../src/pages/admin/schema.ts";

const weeks = COLLECTIONS.find((c) => c.key === "weeks")!;
const gallery = COLLECTIONS.find((c) => c.key === "gallery")!;

// สัปดาห์ที่เพิ่งกดเพิ่ม ยังไม่กรอกอะไร ต้องถูกจับได้ ไม่ใช่ปล่อยไปพังที่ build
const blank = weeks.newItem!();
assert.ok(allProblems(weeks, [blank]).length > 0, "สัปดาห์เปล่าต้องไม่ผ่าน");

// กรอกครบแล้วต้องผ่าน
const full = {
  ...blank, weekNumber: 1, dateStart: "2026-01-05", dateEnd: "2026-01-09",
  steps: ["ทำงาน"], photos: [{ src: "../assets/uploads/a.webp", caption: "" }],
};
assert.deepEqual(allProblems(weeks, [full]), [], "สัปดาห์ที่กรอกครบต้องผ่าน");

// showWhen: วิดีโอ YouTube ไม่ต้องมีไฟล์รูป
const yt = { id: "g1", kind: "video-youtube", category: "การทำงาน", caption: "", youtubeId: "abc" };
assert.deepEqual(allProblems(gallery, [yt]), [], "แกลเลอรีแบบ YouTube ไม่ควรถูกขอรูป");

// แต่แบบรูปภาพต้องมีรูป
const noPic = { id: "g2", kind: "photo", category: "การทำงาน", caption: "", src: "" };
assert.equal(allProblems(gallery, [noPic]).length, 1, "แกลเลอรีแบบรูปต้องขอรูป");

console.log("ok — ตัวกันข้อมูลไม่ครบทำงานถูก");
