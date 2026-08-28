/** โครงฟอร์มของหน้า admin — เพิ่ม/แก้ฟิลด์ที่ไฟล์นี้ที่เดียว */
export type Field =
  | { name: string; label: string; type: "text" | "textarea" | "image" | "number" | "date" }
  | { name: string; label: string; type: "select"; options: string[] }
  | { name: string; label: string; type: "strings" }
  | { name: string; label: string; type: "objects"; fields: Field[] };

export interface Collection {
  key: string;
  label: string;
  path: string;
  /** object = ทั้งไฟล์คือ 1 รายการ, list = ไฟล์มี items เป็นอาร์เรย์ */
  shape: "object" | "list";
  titleField?: string;
  newItem?: () => Record<string, unknown>;
  fields: Field[];
}

const CATS = ["การทำงาน", "การประชุม", "กิจกรรมบริษัท", "ผลงานที่ภาคภูมิใจ"];

export const COLLECTIONS: Collection[] = [
  {
    key: "profile",
    label: "ประวัติส่วนตัว",
    path: "src/content/profile.json",
    shape: "object",
    fields: [
      { name: "fullName", label: "ชื่อ–สกุล", type: "text" },
      { name: "studentId", label: "รหัสนักศึกษา", type: "text" },
      { name: "avatar", label: "รูปประจำตัว", type: "image" },
      { name: "company", label: "ชื่อสถานประกอบการ", type: "text" },
      { name: "department", label: "แผนกที่ฝึกงาน", type: "text" },
      { name: "periodLabel", label: "ช่วงเวลาฝึกงาน", type: "text" },
      { name: "intro", label: "แนะนำตัว", type: "textarea" },
      {
        name: "education", label: "ประวัติการศึกษา", type: "objects",
        fields: [
          { name: "year", label: "ช่วงปี", type: "text" },
          { name: "detail", label: "รายละเอียด", type: "text" },
        ],
      },
      {
        name: "skills", label: "ทักษะ", type: "objects",
        fields: [
          { name: "name", label: "ชื่อทักษะ", type: "text" },
          { name: "level", label: "ระดับ", type: "text" },
        ],
      },
      { name: "talents", label: "ความสามารถพิเศษ", type: "strings" },
      {
        name: "contacts", label: "ช่องทางติดต่อ", type: "objects",
        fields: [
          { name: "label", label: "ประเภท", type: "text" },
          { name: "value", label: "ข้อมูล", type: "text" },
          { name: "href", label: "ลิงก์ (ถ้ามี)", type: "text" },
        ],
      },
    ],
  },
  {
    key: "weeks",
    label: "ผลงานรายสัปดาห์",
    path: "src/content/weeks.json",
    shape: "list",
    titleField: "title",
    newItem: () => ({
      id: `week-${String(Date.now()).slice(-6)}`,
      weekNumber: 1, dateStart: "", dateEnd: "", title: "", assignment: "",
      steps: [""], learned: "", problem: "", solution: "",
      photos: [{ src: "", caption: "" }],
    }),
    fields: [
      { name: "weekNumber", label: "สัปดาห์ที่", type: "number" },
      { name: "dateStart", label: "วันเริ่ม", type: "date" },
      { name: "dateEnd", label: "วันสิ้นสุด", type: "date" },
      { name: "title", label: "หัวข้องาน", type: "text" },
      { name: "assignment", label: "งานที่ได้รับมอบหมาย", type: "textarea" },
      { name: "steps", label: "ขั้นตอนการทำงาน", type: "strings" },
      { name: "learned", label: "สิ่งที่ได้เรียนรู้", type: "textarea" },
      { name: "problem", label: "ปัญหาที่พบ", type: "textarea" },
      { name: "solution", label: "วิธีแก้ไข", type: "textarea" },
      {
        name: "photos", label: "ภาพประกอบ", type: "objects",
        fields: [
          { name: "src", label: "ภาพ", type: "image" },
          { name: "caption", label: "คำบรรยายภาพ", type: "text" },
        ],
      },
    ],
  },
  {
    key: "gallery",
    label: "แกลเลอรี",
    path: "src/content/gallery.json",
    shape: "list",
    titleField: "caption",
    newItem: () => ({ id: `g${String(Date.now()).slice(-6)}`, kind: "photo", category: CATS[0], caption: "", src: "" }),
    fields: [
      { name: "kind", label: "ประเภท", type: "select", options: ["photo", "video-upload", "video-youtube"] },
      { name: "category", label: "หมวด", type: "select", options: CATS },
      { name: "caption", label: "คำบรรยาย", type: "text" },
      { name: "src", label: "รูปภาพ — ใช้เมื่อประเภทเป็น photo", type: "image" },
      { name: "file", label: "ไฟล์วิดีโอใน public/videos — ใช้เมื่อ video-upload", type: "text" },
      { name: "youtubeId", label: "รหัสวิดีโอ YouTube — ใช้เมื่อ video-youtube", type: "text" },
    ],
  },
  {
    key: "summary",
    label: "สรุปผลการฝึกงาน",
    path: "src/content/summary.json",
    shape: "object",
    fields: [
      { name: "gained", label: "สิ่งที่ได้รับจากการฝึกงาน", type: "textarea" },
      { name: "skillsDeveloped", label: "ทักษะที่พัฒนาขึ้น", type: "strings" },
      { name: "impression", label: "ความประทับใจ", type: "textarea" },
      { name: "suggestion", label: "ข้อเสนอแนะ", type: "textarea" },
    ],
  },
];
