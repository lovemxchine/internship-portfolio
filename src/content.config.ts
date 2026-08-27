import { defineCollection, z } from "astro:content";
import { file, glob } from "astro/loaders";

/**
 * โครงข้อมูลทั้งหมดของเว็บ — หลังบ้าน (Pages CMS) จะมาแก้ไฟล์ชุดนี้ตรง ๆ ในเฟสถัดไป
 * กฎ: หน้าเว็บห้าม hardcode เนื้อหา ต้องอ่านจากที่นี่เท่านั้น
 */

/** รูปที่ผูกกับสัปดาห์ — ต่างจาก Gallery Item ตรงที่มีเจ้าของสัปดาห์ชัดเจน */
const weekPhoto = ({ image }: { image: () => z.ZodType }) =>
  z.object({
    src: image(),
    caption: z.string().default(""),
  });

/** ผลงานรายสัปดาห์ — 1 ไฟล์ = 1 สัปดาห์ */
const weeks = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/weeks" }),
  schema: ({ image }) =>
    z.object({
      weekNumber: z.number().int().positive(),
      dateStart: z.date(),
      dateEnd: z.date(),
      title: z.string(),
      assignment: z.string(),
      steps: z.array(z.string()).min(1),
      learned: z.string(),
      problem: z.string(),
      solution: z.string(),
      photos: z.array(weekPhoto({ image })).min(1),
    }),
});

/** ประวัติส่วนตัว — มีชุดเดียว */
const profile = defineCollection({
  loader: file("./src/content/profile.json"),
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      fullName: z.string(),
      studentId: z.string(),
      avatar: image(),
      company: z.string(),
      department: z.string(),
      periodLabel: z.string(),
      intro: z.string(),
      education: z.array(z.object({ year: z.string(), detail: z.string() })),
      skills: z.array(z.object({ name: z.string(), level: z.string() })),
      talents: z.array(z.string()),
      contacts: z.array(z.object({ label: z.string(), value: z.string(), href: z.string().optional() })),
    }),
});

/** แกลเลอรี — รูปหรือวิดีโอลอย ไม่ผูกสัปดาห์ */
const gallery = defineCollection({
  loader: file("./src/content/gallery.json"),
  schema: ({ image }) =>
    z.discriminatedUnion("kind", [
      z.object({
        id: z.string(),
        kind: z.literal("photo"),
        category: z.enum(["การทำงาน", "การประชุม", "กิจกรรมบริษัท", "ผลงานที่ภาคภูมิใจ"]),
        caption: z.string(),
        src: image(),
      }),
      z.object({
        id: z.string(),
        kind: z.literal("video-upload"),
        category: z.enum(["การทำงาน", "การประชุม", "กิจกรรมบริษัท", "ผลงานที่ภาคภูมิใจ"]),
        caption: z.string(),
        /** ไฟล์ใน public/ — อัปโหลดผ่านหลังบ้านได้ราว 25 MB ต่อคลิป */
        file: z.string(),
        poster: image().optional(),
      }),
      z.object({
        id: z.string(),
        kind: z.literal("video-youtube"),
        category: z.enum(["การทำงาน", "การประชุม", "กิจกรรมบริษัท", "ผลงานที่ภาคภูมิใจ"]),
        caption: z.string(),
        youtubeId: z.string(),
      }),
    ]),
});

/** สรุปผลการฝึกงาน — มีชุดเดียว */
const summary = defineCollection({
  loader: file("./src/content/summary.json"),
  schema: z.object({
    id: z.string(),
    gained: z.string(),
    skillsDeveloped: z.array(z.string()),
    impression: z.string(),
    suggestion: z.string(),
  }),
});

export const collections = { weeks, profile, gallery, summary };
