#!/usr/bin/env bash
# ตั้งค่าล็อกอินหลังบ้าน — รันครั้งเดียว
# วิธีใช้:  bash worker/setup.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "ตั้งค่าเข้าสู่ระบบหลังบ้าน"
echo

read -rp "ชื่อผู้ใช้ที่จะให้ลูกค้าใช้ : " ADMIN_USER
read -rsp "รหัสผ่าน (พิมพ์แล้วไม่ขึ้นจอ)  : " PASS; echo
read -rsp "พิมพ์รหัสผ่านอีกครั้ง          : " PASS2; echo
[ "$PASS" = "$PASS2" ] || { echo "รหัสผ่านไม่ตรงกัน"; exit 1; }
[ ${#PASS} -ge 12 ] || { echo "ขอรหัสผ่านอย่างน้อย 12 ตัวอักษร"; exit 1; }

echo
echo "สร้าง fine-grained token ที่ https://github.com/settings/personal-access-tokens/new"
echo "  Repository access : เลือกเฉพาะ repo ของเว็บนี้"
echo "  Permissions       : Contents = Read and write"
read -rsp "วางโทเคนตรงนี้ : " GH_TOKEN; echo

PASS_SHA=$(printf %s "$PASS" | shasum -a 256 | cut -d' ' -f1)
SESSION_SECRET=$(head -c 32 /dev/urandom | base64)

printf %s "$ADMIN_USER"     | npx wrangler secret put ADMIN_USER
printf %s "$PASS_SHA"       | npx wrangler secret put ADMIN_PASS_SHA256
printf %s "$SESSION_SECRET" | npx wrangler secret put SESSION_SECRET
printf %s "$GH_TOKEN"       | npx wrangler secret put GH_TOKEN

npx wrangler deploy
echo
echo "เรียบร้อย เข้าหลังบ้านได้ที่ /admin/ ด้วยชื่อผู้ใช้และรหัสผ่านที่เพิ่งตั้ง"
