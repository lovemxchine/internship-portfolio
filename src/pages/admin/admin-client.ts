import type { Collection, Field } from "./schema";

interface Settings { repo: string; branch: string; uploadDir: string; authUrl: string }
interface Cfg extends Settings { collections: Collection[] }
type Row = Record<string, unknown>;
interface FileState { sha: string; data: Row | Row[] }

const SESSION_KEY = "ipf-admin-session";
const USER_KEY = "ipf-admin-user";
const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`ไม่พบ element: ${sel}`);
  return el;
};

let cfg: Cfg;
let session = "";
const files = new Map<string, FileState>();

/* ---------- กันแก้แล้วลืมบันทึก ---------- */
let dirty = false;
let onDirty: (() => void) | null = null;
const markDirty = (): void => { dirty = true; onDirty?.(); };
const setClean = (): void => { dirty = false; onDirty?.(); };

/* ---------- GitHub API ---------- */
const gh = async (path: string, init?: RequestInit): Promise<unknown> => {
  const res = await fetch(`${cfg.authUrl}/gh${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${session}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
};

const b64encode = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
};
const b64decode = (b64: string): string => {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const getFile = async (path: string): Promise<FileState> => {
  const r = await gh(`/repos/${cfg.repo}/contents/${path}?ref=${cfg.branch}`) as { sha: string; content: string };
  const parsed: unknown = JSON.parse(b64decode(r.content));
  const data = (parsed as { items?: Row[] }).items ?? parsed;
  return { sha: r.sha, data: data as Row | Row[] };
};

const putFile = async (path: string, sha: string, text: string, message: string): Promise<string> => {
  const r = await gh(`/repos/${cfg.repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: b64encode(text), sha, branch: cfg.branch }),
  }) as { content: { sha: string } };
  return r.content.sha;
};

/* ---------- toast ---------- */
let toastTimer = 0;
const toast = (msg: string, bad = false): void => {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("bad", bad);
  t.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { t.hidden = true; }, bad ? 6000 : 2500);
};

/* ---------- ตัวช่วยสร้าง element ---------- */
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
};

const labelled = (text: string, control: HTMLElement, cls = ""): HTMLLabelElement => {
  const l = el("label", `fld ${cls}`.trim());
  l.appendChild(el("span", "", text));
  l.appendChild(control);
  return l;
};

/* ---------- อัปโหลดรูป ---------- */
/* ---------- แปลงไฟล์เป็น base64 ---------- */
const blobToB64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    r.readAsDataURL(blob);
  });

/* ---------- อัปไฟล์ผ่าน Git Data API ----------
   Contents API รับได้แค่ 1 MB ต่อไฟล์ จึงต้องผ่าน blob → tree → commit → ref */
const uploadBinary = async (path: string, blob: Blob, message: string): Promise<string> => {
  const { repo, branch } = cfg;
  const b = await gh(`/repos/${repo}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content: await blobToB64(blob), encoding: "base64" }),
  }) as { sha: string };
  const ref = await gh(`/repos/${repo}/git/ref/heads/${branch}`) as { object: { sha: string } };
  const head = await gh(`/repos/${repo}/git/commits/${ref.object.sha}`) as { tree: { sha: string } };
  const tree = await gh(`/repos/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: head.tree.sha,
      tree: [{ path, mode: "100644", type: "blob", sha: b.sha }],
    }),
  }) as { sha: string };
  const commit = await gh(`/repos/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
  }) as { sha: string };
  await gh(`/repos/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });
  return `/${path}`;
};

/* ---------- ย่อรูปก่อนอัป ----------
   รูปจากมือถือใบนึงราว 3–5 MB ย่อเหลือราว 200–400 KB */
const MAX_EDGE = 1600;
const shrinkImage = async (fileObj: File): Promise<Blob> => {
  const bmp = await createImageBitmap(fileObj);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(bmp.width * scale);
  cv.height = Math.round(bmp.height * scale);
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("เบราว์เซอร์ไม่รองรับการย่อรูป");
  ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
  bmp.close();
  const out = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/webp", 0.82));
  if (!out) throw new Error("ย่อรูปไม่สำเร็จ");
  return out;
};

const uploadImage = async (fileObj: File): Promise<string> => {
  const small = await shrinkImage(fileObj);
  const name = `${Date.now()}-${fileObj.name.replace(/\.[^.]+$/, "").replace(/[^\w-]/g, "-")}.webp`;
  return uploadBinary(`${cfg.uploadDir}/${name}`, small, `อัปโหลดรูป ${name}`);
};

/* ---------- บีบวิดีโอก่อนอัป ----------
   ดู docs/adr/0001 — อัดซ้ำขณะเล่นจริง ใช้เวลาเท่าความยาวคลิป */
const VIDEO_LIMIT = 25 * 1024 * 1024;

interface CapturableVideo extends HTMLVideoElement {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
}

const compressVideo = (fileObj: File, onProgress: (pct: number) => void): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const v = document.createElement("video") as CapturableVideo;
    v.src = URL.createObjectURL(fileObj);
    v.muted = true;
    v.onerror = () => reject(new Error("เปิดไฟล์วิดีโอนี้ไม่ได้"));
    v.onloadedmetadata = () => {
      const grab = v.captureStream ?? v.mozCaptureStream;
      if (!grab) { reject(new Error("เบราว์เซอร์นี้บีบวิดีโอไม่ได้ ใช้ลิงก์ YouTube แทน")); return; }
      // เผื่อ 15% ให้เสียงและ container
      const target = Math.round((VIDEO_LIMIT * 8 * 0.85) / Math.max(v.duration, 1));
      const rec = new MediaRecorder(grab.call(v), {
        videoBitsPerSecond: Math.min(Math.max(target, 500_000), 2_500_000),
      });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => { URL.revokeObjectURL(v.src); resolve(new Blob(chunks, { type: rec.mimeType })); };
      rec.onerror = () => reject(new Error("บีบวิดีโอไม่สำเร็จ"));
      v.ontimeupdate = () => onProgress(Math.round((v.currentTime / v.duration) * 100));
      v.onended = () => rec.stop();
      rec.start(1000);
      v.play().catch(() => reject(new Error("เล่นไฟล์วิดีโอไม่ได้")));
    };
  });

const uploadVideo = async (fileObj: File, onProgress: (pct: number) => void): Promise<string> => {
  const blob = fileObj.size <= VIDEO_LIMIT ? fileObj : await compressVideo(fileObj, onProgress);
  if (blob.size > VIDEO_LIMIT) throw new Error("คลิปยังใหญ่เกิน 25 MB หลังบีบ ลองตัดให้สั้นลงหรือใช้ลิงก์ YouTube");
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const name = `${Date.now()}-${fileObj.name.replace(/\.[^.]+$/, "").replace(/[^\w-]/g, "-")}.${ext}`;
  await uploadBinary(`public/videos/${name}`, blob, `อัปโหลดวิดีโอ ${name}`);
  // public/ ถูกคัดลอกไปเป็นราก เส้นทางที่หน้าเว็บใช้จึงไม่มี public/
  return `/videos/${name}`;
};

/* ---------- ตามสถานะ build ---------- */
const watchBuild = async (): Promise<void> => {
  const deadline = Date.now() + 5 * 60_000;
  await new Promise((r) => window.setTimeout(r, 6000));
  while (Date.now() < deadline) {
    const res = await gh(`/repos/${cfg.repo}/actions/runs?branch=${cfg.branch}&per_page=1`) as {
      workflow_runs: { status: string; conclusion: string | null }[];
    };
    const run = res.workflow_runs[0];
    if (run?.status === "completed") {
      if (run.conclusion === "success") toast("เว็บอัปเดตเรียบร้อยแล้ว");
      else toast("อัปเดตเว็บไม่สำเร็จ ลองบันทึกอีกครั้ง", true);
      return;
    }
    toast("กำลังอัปเดตเว็บ…");
    await new Promise((r) => window.setTimeout(r, 5000));
  }
  toast("อัปเดตนานผิดปกติ ลองรีเฟรชหน้าเว็บดูอีกที", true);
};

/* ปุ่มเลือกไฟล์ — ซ่อน input เดิมไว้ใน label เพราะข้อความ "Choose File" ของเบราว์เซอร์แก้เป็นไทยไม่ได้ */
const filePicker = (accept: string): HTMLInputElement => {
  const inp = el("input");
  inp.type = "file";
  inp.accept = accept;
  inp.className = "sr-only";
  return inp;
};

/* ---------- สร้างฟอร์มตาม schema ---------- */
const renderField = (f: Field, obj: Row): HTMLElement => {
  if (f.type === "strings") {
    const box = el("div", "sub");
    box.appendChild(el("span", "", f.label));
    const list = Array.isArray(obj[f.name]) ? (obj[f.name] as string[]) : [];
    const redraw = (): void => {
      box.querySelectorAll(".line").forEach((n) => n.remove());
      list.forEach((v, i) => {
        const line = el("div", "line imgrow");
        const inp = el("input");
        inp.value = v;
        inp.addEventListener("input", () => { list[i] = inp.value; });
        const del = el("button", "ghost danger", "ลบ");
        del.type = "button";
        del.addEventListener("click", () => { list.splice(i, 1); redraw(); });
        line.append(inp, del);
        box.insertBefore(line, box.lastElementChild);
      });
    };
    const add = el("button", "ghost", `+ เพิ่ม${f.label}`);
    add.type = "button";
    add.addEventListener("click", () => { list.push(""); redraw(); });
    box.appendChild(add);
    obj[f.name] = list;
    redraw();
    return box;
  }

  if (f.type === "objects") {
    const box = el("div", "sub");
    box.appendChild(el("span", "", f.label));
    const list = Array.isArray(obj[f.name]) ? (obj[f.name] as Row[]) : [];
    const holder = el("div", "stack");
    const redraw = (): void => {
      holder.textContent = "";
      list.forEach((item, i) => {
        const sub = el("div", "sub sub-grid");
        f.fields.forEach((sf) => sub.appendChild(renderField(sf, item)));
        const del = el("button", "ghost danger", "ลบรายการนี้");
        del.type = "button";
        del.addEventListener("click", () => { list.splice(i, 1); markDirty(); redraw(); });
        const row = el("div", "row");
        row.appendChild(del);
        sub.appendChild(row);
        holder.appendChild(sub);
      });
    };
    const add = el("button", "ghost", `+ เพิ่ม${f.label}`);
    add.type = "button";
    add.addEventListener("click", () => {
      const blank: Row = {};
      f.fields.forEach((sf) => { blank[sf.name] = sf.type === "strings" || sf.type === "objects" ? [] : ""; });
      list.push(blank);
      markDirty();
      redraw();
    });
    box.append(holder, add);
    obj[f.name] = list;
    redraw();
    return box;
  }

  if (f.type === "image") {
    const wrap = el("div", `fld ${f.width ?? ""}`.trim());
    wrap.appendChild(el("span", "", f.label));
    const rowEl = el("div", "imgrow");
    const img = el("img", "thumb");
    const cur = typeof obj[f.name] === "string" ? (obj[f.name] as string) : "";
    if (cur) img.src = cur.startsWith("/") ? cur : cur.replace(/^\.\.\//, "/src/");
    const pick = filePicker("image/*");
    const pickBox = el("label", "pickbtn", "เลือกรูป");
    pickBox.appendChild(pick);
    pick.addEventListener("change", () => {
      const chosen = pick.files?.[0];
      if (!chosen) return;
      toast("กำลังอัปโหลดรูป…");
      uploadImage(chosen)
        .then((p) => { obj[f.name] = p; img.src = p; toast("อัปโหลดรูปแล้ว"); })
        .catch((e: unknown) => toast(`อัปโหลดไม่สำเร็จ: ${String(e)}`, true));
    });
    rowEl.append(img, pickBox);
    wrap.appendChild(rowEl);
    return wrap;
  }

  if (f.type === "video") {
    const wrap = el("div", `fld ${f.width ?? ""}`.trim());
    wrap.appendChild(el("span", "", f.label));
    const status = el("small", "hint", String(obj[f.name] ?? "ยังไม่มีไฟล์"));
    const pick = filePicker("video/*");
    const pickBox = el("label", "pickbtn", "เลือกวิดีโอ");
    pickBox.appendChild(pick);
    pick.addEventListener("change", () => {
      const chosen = pick.files?.[0];
      if (!chosen) return;
      pick.disabled = true;
      const big = chosen.size > VIDEO_LIMIT;
      status.textContent = big ? "กำลังบีบคลิป อย่าปิดหรือสลับแท็บ…" : "กำลังอัปโหลด…";
      uploadVideo(chosen, (pct) => { status.textContent = `กำลังบีบคลิป ${pct}% อย่าปิดหรือสลับแท็บ`; })
        .then((path) => {
          obj[f.name] = path;
          status.textContent = path;
          toast("อัปโหลดวิดีโอแล้ว");
        })
        .catch((e: unknown) => {
          status.textContent = "อัปโหลดไม่สำเร็จ";
          toast(String(e instanceof Error ? e.message : e), true);
        })
        .finally(() => { pick.disabled = false; });
    });
    wrap.append(pickBox, status);
    return wrap;
  }

  if (f.type === "select") {
    const sel = el("select");
    f.options.forEach((o, i) => {
      const opt = el("option", "", f.optionLabels?.[i] ?? o);
      opt.value = o;
      sel.appendChild(opt);
    });
    sel.value = String(obj[f.name] ?? f.options[0]);
    sel.addEventListener("change", () => { obj[f.name] = sel.value; markDirty(); });
    return labelled(f.label, sel, f.width ?? "");
  }

  const input = f.type === "textarea" ? el("textarea") : el("input");
  if (input instanceof HTMLInputElement) {
    input.type = f.type === "number" ? "number" : f.type === "date" ? "date" : "text";
  }
  input.value = String(obj[f.name] ?? "");
  input.addEventListener("input", () => {
    obj[f.name] = f.type === "number" ? Number(input.value) : input.value;
    markDirty();
  });
  return labelled(f.label, input, f.width ?? "");
};

/* ---------- แผงของแต่ละ collection ---------- */
/** ช่องที่ผูกกับ showWhen จะโผล่เฉพาะตอนค่าตรง */
const visible = (f: Field, row: Row): boolean =>
  !f.showWhen || f.showWhen.equals.includes(String(row[f.showWhen.field] ?? ""));

const fieldsInto = (box: HTMLElement, fields: Field[], row: Row, redraw: () => void): void => {
  fields.filter((f) => visible(f, row)).forEach((f) => {
    const node = renderField(f, row);
    // เปลี่ยนประเภทแล้วต้องวาดใหม่ เพราะช่องที่เกี่ยวข้องเปลี่ยนตาม
    if (f.type === "select" && fields.some((o) => o.showWhen?.field === f.name)) {
      node.addEventListener("change", redraw);
    }
    box.appendChild(node);
  });
};

const renderPanel = (col: Collection): void => {
  const panel = $("#panel");
  panel.textContent = "";
  const state = files.get(col.path);
  if (!state) return;

  const saveBar = el("div", "sticky-save row");
  const saveBtn = el("button", "stamp", "บันทึกลงเว็บ");
  saveBtn.type = "button";
  const saveNote = el("small", "hint");
  onDirty = () => {
    saveBtn.disabled = !dirty;
    saveNote.textContent = dirty ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : "บันทึกครบแล้ว";
  };
  saveBtn.addEventListener("click", () => {
    const body = col.shape === "list" ? { items: state.data } : state.data;
    saveBtn.disabled = true;
    saveNote.textContent = "กำลังบันทึก…";
    putFile(col.path, state.sha, `${JSON.stringify(body, null, 2)}\n`, `แก้ไข${col.label}ผ่านหน้าจัดการ`)
      .then((sha) => { state.sha = sha; setClean(); toast("บันทึกแล้ว"); void watchBuild(); })
      .catch((e: unknown) => {
        toast(`บันทึกไม่สำเร็จ: ${String(e)}`, true);
        saveBtn.disabled = false;
      });
  });
  saveBar.append(saveBtn, saveNote);

  if (col.shape === "object") {
    const card = el("div", "card");
    const grid = el("div", "cardbody");
    card.appendChild(grid);
    const draw = (): void => { grid.textContent = ""; fieldsInto(grid, col.fields, state.data as Row, draw); };
    draw();
    panel.append(card, saveBar);
    onDirty();
    return;
  }

  const rows = state.data as Row[];
  const holder = el("div");
  const open = new Set<number>();          // การ์ดที่กางอยู่ คงไว้ตอนวาดใหม่
  const redraw = (): void => {
    holder.textContent = "";
    if (rows.length === 0) holder.appendChild(el("p", "muted", `ยังไม่มี${col.label} กดปุ่มด้านล่างเพื่อเพิ่มรายการแรก`));
    rows.forEach((item, i) => {
      const card = document.createElement("details");
      card.className = "card";
      card.open = open.has(i);
      card.addEventListener("toggle", () => { card.open ? open.add(i) : open.delete(i); });

      const head = document.createElement("summary");
      const title = String(item[col.titleField ?? "title"] ?? "") || "(ยังไม่มีชื่อ)";
      head.appendChild(el("h3", "", `${i + 1}. ${title}`));

      const tools = el("div", "row tools");
      const move = (to: number): void => {
        if (to < 0 || to >= rows.length) return;
        [rows[i], rows[to]] = [rows[to], rows[i]];
        open.clear();
        markDirty();
        redraw();
      };
      // ปุ่มอยู่ใน summary ต้องกันไม่ให้การกดไปพับ/กางการ์ด
      const tool = (text: string, hint: string, act: () => void): HTMLButtonElement => {
        const b = el("button", "ghost", text);
        b.type = "button";
        b.title = hint;
        b.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); act(); });
        return b;
      };
      const up = tool("↑", "เลื่อนขึ้น", () => move(i - 1));
      up.disabled = i === 0;
      const down = tool("↓", "เลื่อนลง", () => move(i + 1));
      down.disabled = i === rows.length - 1;
      const del = tool("ลบ", "ลบรายการนี้", () => {
        if (!window.confirm(`ลบ "${title}" ออกจาก${col.label}?`)) return;
        rows.splice(i, 1);
        open.clear();
        markDirty();
        redraw();
      });
      del.className = "ghost danger";
      tools.append(up, down, del);
      head.appendChild(tools);
      card.appendChild(head);

      const body = el("div", "cardbody");
      const drawBody = (): void => { body.textContent = ""; fieldsInto(body, col.fields, item, drawBody); };
      drawBody();
      card.appendChild(body);
      holder.appendChild(card);
    });
  };
  const add = el("button", "stamp outline", `+ เพิ่ม${col.label}`);
  add.type = "button";
  add.addEventListener("click", () => {
    rows.push(col.newItem ? col.newItem() : {});
    open.clear();
    open.add(rows.length - 1);           // กางเฉพาะใบที่เพิ่งเพิ่ม
    markDirty();
    redraw();
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });
  redraw();
  panel.append(holder, add, saveBar);
  onDirty();
};

/* ---------- เข้าสู่ระบบ ---------- */
const start = async (who: string): Promise<void> => {
  $("#who").textContent = who;
  $("#logout").hidden = false;
  $("#login").hidden = true;
  $("#app").hidden = false;

  await Promise.all(cfg.collections.map(async (c) => { files.set(c.path, await getFile(c.path)); }));

  const tabs = $("#tabs");
  tabs.textContent = "";
  cfg.collections.forEach((c, i) => {
    const data = files.get(c.path)?.data;
    const count = Array.isArray(data) ? ` ${data.length}` : "";
    const b = el("button", `tab${i === 0 ? " on" : ""}`, `${c.label}${count}`);
    b.type = "button";
    b.addEventListener("click", () => {
      if (dirty && !window.confirm("ยังมีการแก้ไขที่ไม่ได้บันทึก ออกจากหน้านี้เลยไหม")) return;
      setClean();
      tabs.querySelectorAll(".tab").forEach((n) => n.classList.remove("on"));
      b.classList.add("on");
      renderPanel(c);
    });
    tabs.appendChild(b);
  });
  renderPanel(cfg.collections[0]);
};

/** ส่งชื่อผู้ใช้กับรหัสผ่านให้ Worker ตรวจ แล้วรับบัตรผ่านกลับมา */
const login = async (user: string, pass: string): Promise<void> => {
  const res = await fetch(`${cfg.authUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, pass }),
  });
  const body = await res.json() as { session?: string; error?: string };
  if (!res.ok || !body.session) throw new Error(body.error ?? "เข้าสู่ระบบไม่สำเร็จ");
  session = body.session;
  await start(user);
  localStorage.setItem(SESSION_KEY, session);
  localStorage.setItem(USER_KEY, user);
};

const showLoginError = (msg: string): void => {
  const err = $("#loginerr");
  err.textContent = `เข้าสู่ระบบไม่สำเร็จ — ${msg}`;
  err.hidden = false;
};

export const mountAdmin = (): void => {
  const collections = JSON.parse($("#cfg").textContent ?? "[]") as Collection[];
  const base = document.querySelector<HTMLMetaElement>('meta[name="ipf-base"]')?.content ?? "/";

  void fetch(`${base}admin/settings.json`)
    .then((r) => r.json() as Promise<Settings>)
    .then((s) => {
      cfg = { ...s, collections };
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        session = saved;
        start(localStorage.getItem(USER_KEY) ?? "").catch(() => localStorage.removeItem(SESSION_KEY));
      }
    })
    .catch(() => showLoginError("โหลดการตั้งค่าไม่ได้"));

  // เตือนก่อนปิดแท็บถ้ายังมีของค้าง — ต้องผูกในนี้ ไม่ใช่ระดับโมดูล เพราะตอน build ไม่มี window
  window.addEventListener("beforeunload", (ev) => {
    if (!dirty) return;
    ev.preventDefault();
    ev.returnValue = "";
  });

  const form = $<HTMLFormElement>("#loginform");
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const btn = $<HTMLButtonElement>("#signin");
    btn.disabled = true;
    $("#loginerr").hidden = true;
    login($<HTMLInputElement>("#user").value.trim(), $<HTMLInputElement>("#pass").value)
      .catch((e: unknown) => showLoginError(e instanceof Error ? e.message : String(e)))
      .finally(() => { btn.disabled = false; });
  });

  $("#logout").addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
  });
};
