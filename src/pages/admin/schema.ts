/** โครงฟอร์มของหน้า admin — เพิ่ม/แก้ฟิลด์ที่ไฟล์นี้ที่เดียว */
/** แสดงช่องนี้เฉพาะตอนอีกช่องมีค่าตามที่กำหนด */
interface ShowWhen {
  showWhen?: { field: string; equals: string[] };
  /** half = ช่องสั้น วางคู่กับช่องข้าง ๆ ได้ ไม่กินทั้งแถว */
  width?: "half";
  /** รายการที่ schema บังคับว่าต้องมีอย่างน้อย 1 ชิ้น ถ้าว่าง build จะล้ม */
  required?: true;
}

export type Field =
  | ({ name: string; label: string; type: "text" | "textarea" | "image" | "video" | "number" | "date" } & ShowWhen)
  | ({ name: string; label: string; type: "select"; options: string[]; optionLabels?: string[] } & ShowWhen)
  | ({ name: string; label: string; type: "strings" } & ShowWhen)
  | ({ name: string; label: string; type: "objects"; fields: Field[] } & ShowWhen);

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
      { name: "fullName", label: "ชื่อ–สกุล", type: "text", width: "half" },
      { name: "studentId", label: "รหัสนักศึกษา", type: "text", width: "half" },
      { name: "avatar", label: "รูปประจำตัว", type: "image" },
      { name: "company", label: "ชื่อสถานประกอบการ", type: "text", width: "half" },
      { name: "department", label: "แผนกที่ฝึกงาน", type: "text", width: "half" },
      { name: "periodLabel", label: "ช่วงเวลาฝึกงาน", type: "text", width: "half" },
      { name: "intro", label: "แนะนำตัว", type: "textarea" },
      {
        name: "education", label: "ประวัติการศึกษา", type: "objects",
        fields: [
          { name: "year", label: "ช่วงปี", type: "text", width: "half" },
          { name: "detail", label: "รายละเอียด", type: "text" },
        ],
      },
      {
        name: "skills", label: "ทักษะ", type: "objects",
        fields: [
          { name: "name", label: "ชื่อทักษะ", type: "text", width: "half" },
          { name: "level", label: "ระดับ", type: "text", width: "half" },
        ],
      },
      { name: "talents", label: "ความสามารถพิเศษ", type: "strings" },
      {
        name: "contacts", label: "ช่องทางติดต่อ", type: "objects",
        fields: [
          { name: "label", label: "ประเภท", type: "text", width: "half" },
          { name: "value", label: "ข้อมูล", type: "text", width: "half" },
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
      { name: "weekNumber", label: "สัปดาห์ที่", type: "number", width: "half" },
      { name: "dateStart", label: "วันเริ่ม", type: "date", width: "half" },
      { name: "dateEnd", label: "วันสิ้นสุด", type: "date", width: "half" },
      { name: "title", label: "หัวข้องาน", type: "text" },
      { name: "assignment", label: "งานที่ได้รับมอบหมาย", type: "textarea" },
      { name: "steps", label: "ขั้นตอนการทำงาน", type: "strings", required: true },
      { name: "learned", label: "สิ่งที่ได้เรียนรู้", type: "textarea" },
      { name: "problem", label: "ปัญหาที่พบ", type: "textarea" },
      { name: "solution", label: "วิธีแก้ไข", type: "textarea" },
      {
        name: "photos", label: "ภาพประกอบ", type: "objects", required: true,
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
      {
        name: "kind", label: "ประเภท", type: "select",
        options: ["photo", "video-upload", "video-youtube"],
        optionLabels: ["รูปภาพ", "วิดีโอ อัปโหลดเอง", "วิดีโอ จาก YouTube"],
        width: "half",
      },
      { name: "category", label: "หมวด", type: "select", options: CATS, width: "half" },
      { name: "caption", label: "คำบรรยาย", type: "text" },
      { name: "src", label: "รูปภาพ", type: "image", showWhen: { field: "kind", equals: ["photo"] } },
      { name: "file", label: "ไฟล์วิดีโอ", type: "video", showWhen: { field: "kind", equals: ["video-upload"] } },
      { name: "youtubeId", label: "รหัสวิดีโอ YouTube", type: "text", showWhen: { field: "kind", equals: ["video-youtube"] } },
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
