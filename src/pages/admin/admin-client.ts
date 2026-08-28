import type { Collection, Field } from "./schema";

interface Settings { repo: string; branch: string; uploadDir: string; authUrl: string }
interface Cfg extends Settings { collections: Collection[] }
type Row = Record<string, unknown>;
interface FileState { sha: string; data: Row | Row[] }

const TOKEN_KEY = "ipf-admin-token";
const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`ไม่พบ element: ${sel}`);
  return el;
};

let cfg: Cfg;
let token = "";
const files = new Map<string, FileState>();

/* ---------- GitHub API ---------- */
const gh = async (path: string, init?: RequestInit): Promise<unknown> => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", ...(init?.headers ?? {}) },
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

const labelled = (text: string, control: HTMLElement): HTMLLabelElement => {
  const l = el("label", "fld");
  l.appendChild(el("span", "", text));
  l.appendChild(control);
  return l;
};

/* ---------- อัปโหลดรูป ---------- */
const uploadImage = async (fileObj: File): Promise<string> => {
  const buf = new Uint8Array(await fileObj.arrayBuffer());
  let bin = "";
  buf.forEach((b) => { bin += String.fromCharCode(b); });
  const safe = fileObj.name.replace(/[^\w.-]/g, "-");
  const path = `${cfg.uploadDir}/${Date.now()}-${safe}`;
  await gh(`/repos/${cfg.repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message: `อัปโหลดรูป ${safe}`, content: btoa(bin), branch: cfg.branch }),
  });
  return `/${path}`;
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
    const holder = el("div");
    const redraw = (): void => {
      holder.textContent = "";
      list.forEach((item, i) => {
        const sub = el("div", "sub");
        f.fields.forEach((sf) => sub.appendChild(renderField(sf, item)));
        const del = el("button", "ghost danger", "ลบรายการนี้");
        del.type = "button";
        del.addEventListener("click", () => { list.splice(i, 1); redraw(); });
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
      redraw();
    });
    box.append(holder, add);
    obj[f.name] = list;
    redraw();
    return box;
  }

  if (f.type === "image") {
    const wrap = el("div", "fld");
    wrap.appendChild(el("span", "", f.label));
    const rowEl = el("div", "imgrow");
    const img = el("img", "thumb");
    const cur = typeof obj[f.name] === "string" ? (obj[f.name] as string) : "";
    if (cur) img.src = cur.startsWith("/") ? cur : cur.replace(/^\.\.\//, "/src/");
    const pick = el("input");
    pick.type = "file";
    pick.accept = "image/*";
    pick.addEventListener("change", () => {
      const chosen = pick.files?.[0];
      if (!chosen) return;
      toast("กำลังอัปโหลดรูป…");
      uploadImage(chosen)
        .then((p) => { obj[f.name] = p; img.src = p; toast("อัปโหลดรูปแล้ว"); })
        .catch((e: unknown) => toast(`อัปโหลดไม่สำเร็จ: ${String(e)}`, true));
    });
    rowEl.append(img, pick);
    wrap.appendChild(rowEl);
    return wrap;
  }

  if (f.type === "select") {
    const sel = el("select");
    f.options.forEach((o) => {
      const opt = el("option", "", o);
      opt.value = o;
      sel.appendChild(opt);
    });
    sel.value = String(obj[f.name] ?? f.options[0]);
    sel.addEventListener("change", () => { obj[f.name] = sel.value; });
    return labelled(f.label, sel);
  }

  const input = f.type === "textarea" ? el("textarea") : el("input");
  if (input instanceof HTMLInputElement) {
    input.type = f.type === "number" ? "number" : f.type === "date" ? "date" : "text";
  }
  input.value = String(obj[f.name] ?? "");
  input.addEventListener("input", () => {
    obj[f.name] = f.type === "number" ? Number(input.value) : input.value;
  });
  return labelled(f.label, input);
};

/* ---------- แผงของแต่ละ collection ---------- */
const renderPanel = (col: Collection): void => {
  const panel = $("#panel");
  panel.textContent = "";
  const state = files.get(col.path);
  if (!state) return;

  const saveBar = el("div", "sticky-save row");
  const saveBtn = el("button", "stamp", "บันทึกลงเว็บ");
  saveBtn.type = "button";
  saveBtn.addEventListener("click", () => {
    const body = col.shape === "list" ? { items: state.data } : state.data;
    saveBtn.disabled = true;
    toast("กำลังบันทึก…");
    putFile(col.path, state.sha, `${JSON.stringify(body, null, 2)}\n`, `แก้ไข${col.label}ผ่านหน้าจัดการ`)
      .then((sha) => { state.sha = sha; toast("บันทึกแล้ว เว็บจะอัปเดตใน 1–2 นาที"); })
      .catch((e: unknown) => toast(`บันทึกไม่สำเร็จ: ${String(e)}`, true))
      .finally(() => { saveBtn.disabled = false; });
  });
  saveBar.appendChild(saveBtn);

  if (col.shape === "object") {
    const card = el("div", "card");
    col.fields.forEach((f) => card.appendChild(renderField(f, state.data as Row)));
    panel.append(card, saveBar);
    return;
  }

  const rows = state.data as Row[];
  const holder = el("div");
  const redraw = (): void => {
    holder.textContent = "";
    rows.forEach((item, i) => {
      const card = el("div", "card");
      const head = el("header");
      const title = String(item[col.titleField ?? "title"] ?? "") || "(ยังไม่มีชื่อ)";
      head.appendChild(el("h3", "", title));
      const del = el("button", "ghost danger", "ลบ");
      del.type = "button";
      del.addEventListener("click", () => {
        if (!window.confirm(`ลบ "${title}" ออกจาก${col.label}?`)) return;
        rows.splice(i, 1);
        redraw();
      });
      head.appendChild(del);
      card.appendChild(head);
      col.fields.forEach((f) => card.appendChild(renderField(f, item)));
      holder.appendChild(card);
    });
  };
  const add = el("button", "ghost", `+ เพิ่ม${col.label}`);
  add.type = "button";
  add.addEventListener("click", () => {
    rows.push(col.newItem ? col.newItem() : {});
    redraw();
  });
  redraw();
  panel.append(holder, add, saveBar);
};

/* ---------- เข้าสู่ระบบ ---------- */
const start = async (): Promise<void> => {
  const user = await gh("/user") as { login: string };
  $("#who").textContent = user.login;
  $("#logout").hidden = false;
  $("#login").hidden = true;
  $("#app").hidden = false;

  await Promise.all(cfg.collections.map(async (c) => { files.set(c.path, await getFile(c.path)); }));

  const tabs = $("#tabs");
  tabs.textContent = "";
  cfg.collections.forEach((c, i) => {
    const b = el("button", `tab${i === 0 ? " on" : ""}`, c.label);
    b.type = "button";
    b.addEventListener("click", () => {
      tabs.querySelectorAll(".tab").forEach((n) => n.classList.remove("on"));
      b.classList.add("on");
      renderPanel(c);
    });
    tabs.appendChild(b);
  });
  renderPanel(cfg.collections[0]);
};

/** เข้าสู่ระบบด้วย GitHub ผ่าน Worker — เปิด popup แล้วรอ token กลับมา */
const loginWithGitHub = (): void => {
  const popup = window.open(`${cfg.authUrl}/auth`, "gh-login", "width=720,height=760");
  const onMsg = (ev: MessageEvent): void => {
    const d = ev.data as { source?: string; token?: string | null; error?: string | null };
    if (d?.source !== "ipf-admin-auth") return;
    window.removeEventListener("message", onMsg);
    popup?.close();
    if (!d.token) { showLoginError(d.error ?? "ไม่ได้รับโทเคนจาก GitHub"); return; }
    token = d.token;
    start()
      .then(() => localStorage.setItem(TOKEN_KEY, token))
      .catch((e: unknown) => showLoginError(String(e)));
  };
  window.addEventListener("message", onMsg);
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
      if (cfg.authUrl) {
        $("#ghlogin").hidden = false;
        $("#ghlogin").addEventListener("click", loginWithGitHub);
      } else {
        $("#tokbox").hidden = false;
        $<HTMLButtonElement>("#signin").className = "stamp";
      }
      const saved = localStorage.getItem(TOKEN_KEY);
      if (saved) { token = saved; start().catch(() => localStorage.removeItem(TOKEN_KEY)); }
    })
    .catch(() => showLoginError("โหลด settings.json ไม่ได้"));

  $<HTMLButtonElement>("#signin").addEventListener("click", () => {
    if ($("#tokbox").hidden) { $("#tokbox").hidden = false; return; }
    token = $<HTMLInputElement>("#tok").value.trim();
    if (!token) return;
    start()
      .then(() => localStorage.setItem(TOKEN_KEY, token))
      .catch((e: unknown) => showLoginError(`ตรวจว่าโทเคนถูกต้องและมีสิทธิ์ Contents บน repo นี้ (${String(e)})`));
  });

  $("#logout").addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    location.reload();
  });

};
