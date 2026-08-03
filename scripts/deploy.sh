#!/bin/bash
# Deploy theuni.vn — luôn đủ 3 thư mục + restart, tránh thiếu bước gây mất CSS
set -euo pipefail

# Địa chỉ server đọc từ biến môi trường hoặc file .deploy.env (không commit lên git)
if [ -f "$(dirname "$0")/../.deploy.env" ]; then
  source "$(dirname "$0")/../.deploy.env"
fi
SERVER="${DEPLOY_SERVER:?Thiếu DEPLOY_SERVER — tạo file .deploy.env với dòng: DEPLOY_SERVER=user@ip}"
DEST="${DEPLOY_DEST:-/var/www/theuniv/frontend}"

echo "→ Build..."
npm run build

echo "→ Đẩy standalone..."
rsync -az --delete --timeout=120 .next/standalone/ "$SERVER:$DEST/"

echo "→ Đẩy static..."
rsync -az --delete --timeout=120 .next/static/ "$SERVER:$DEST/.next/static/"

echo "→ Đẩy public (giữ uploads)..."
rsync -az --delete --timeout=120 --exclude uploads public/ "$SERVER:$DEST/public/"

echo "→ Restart app..."
ssh "$SERVER" "pm2 restart theuniv-frontend --update-env >/dev/null 2>&1 && sleep 3"

echo "→ Kiểm tra..."
for p in / /css/main.scss.css /theme/logo.png /admin/login /api/home; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://theuni.vn$p")
  echo "   $code $p"
  [ "$code" = "200" ] || { echo "✗ LỖI: $p trả về $code"; exit 1; }
done
echo "✓ Deploy thành công!"
